import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { promisify } from 'util'
import FormData from 'form-data'

const execAsync = promisify(exec)

const BACKUP_DIR = path.join(
  fs.existsSync(path.join(process.cwd(), 'backups')) ? process.cwd() : os.tmpdir(),
  'backups'
)
const PUBLIC_BACKUP_DIR = path.join(
  fs.existsSync(path.join(process.cwd(), 'public', 'backups')) ? process.cwd() : os.tmpdir(),
  'public', 'backups'
)

function ensureDirectories() {
  for (const dir of [BACKUP_DIR, PUBLIC_BACKUP_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

function findPgDump(): string | null {
  const candidates = ['pg_dump', '/usr/bin/pg_dump', '/usr/local/bin/pg_dump', '/opt/homebrew/bin/pg_dump']
  for (const cmd of candidates) {
    if (fs.existsSync(cmd)) return cmd
    try {
      const result = execSync(`command -v ${cmd} 2>/dev/null`, { encoding: 'utf8', timeout: 2000 })
      if (result?.trim()) return result.trim()
    } catch {}
  }
  return null
}

const execSync = (() => {
  const { execSync } = require('child_process')
  return execSync
})()

function getDbType(): 'postgresql' | 'sqlite' {
  const url = process.env.DATABASE_URL || ''
  if (url.includes('postgresql') || url.includes('postgres://')) return 'postgresql'
  return 'sqlite'
}

function getTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

async function prismaDump(): Promise<string> {
  const modelNames = [
    'User', 'Plan', 'Request', 'Product', 'Event', 'ServiceOffering', 'Group',
    'BulletinBoard', 'BulletinPin', 'Post', 'ForumPost', 'ForumReply',
    'SchoolContent', 'Notification', 'Message', 'Connection', 'Comment',
    'PlanUpdate', 'PlanUpdateComment', 'Payment', 'EscrowTransaction',
    'BarterOffer', 'Appointment', 'Availability', 'Backlink', 'Hashtag',
    'VideoRoom', 'InviteCode', 'Backup',
  ]
  const data: Record<string, unknown[]> = {}
  for (const name of modelNames) {
    try {
      const model = (prisma as any)[name.toLowerCase()]
      if (model?.findMany) {
        data[name] = await model.findMany()
      }
    } catch {}
  }
  return JSON.stringify(data, null, 2)
}

export async function createDatabaseDump(): Promise<{
  filePath: string
  fileName: string
  fileSize: number
  dbSize: number
}> {
  ensureDirectories()

  const timestamp = getTimestamp()
  const fileName = `backup-${timestamp}.sql.gz`
  const filePath = path.join(BACKUP_DIR, fileName)

  let dbSize = 0

  const pgDumpPath = findPgDump()
  const dbType = getDbType()

  if (dbType === 'postgresql' && pgDumpPath) {
    try {
      const dumpFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`)
      await execAsync(`"${pgDumpPath}" "${process.env.DATABASE_URL}" > "${dumpFile}"`)

      const stats = fs.statSync(dumpFile)
      dbSize = stats.size

      await execAsync(`gzip -f "${dumpFile}"`)

      const gzPath = dumpFile + '.gz'
      if (fs.existsSync(gzPath) && gzPath !== filePath) {
        fs.renameSync(gzPath, filePath)
      }
    } catch (err) {
      console.error('pg_dump failed, falling back to Prisma dump:', err)
      return createPrismaDump(timestamp, fileName, filePath)
    }
  } else if (dbType === 'sqlite') {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath)
      dbSize = stats.size
      await execAsync(`sqlite3 "${dbPath}" ".backup '${path.join(BACKUP_DIR, `backup-${timestamp}.db`)}'"`)
      await execAsync(`gzip -c "${path.join(BACKUP_DIR, `backup-${timestamp}.db`)}" > "${filePath}"`)
      fs.unlinkSync(path.join(BACKUP_DIR, `backup-${timestamp}.db`))
    }
  } else {
    return createPrismaDump(timestamp, fileName, filePath)
  }

  const fileStats = fs.statSync(filePath)
  return { filePath, fileName, fileSize: fileStats.size, dbSize }
}

async function createPrismaDump(timestamp: string, fileName: string, filePath: string): Promise<{
  filePath: string
  fileName: string
  fileSize: number
  dbSize: number
}> {
  const dumpContent = await prismaDump()
  const dbSize = Buffer.byteLength(dumpContent, 'utf8')
  const jsonPath = filePath.replace(/\.gz$/, '')
  fs.writeFileSync(jsonPath, dumpContent, 'utf8')
  try {
    await execAsync(`gzip -f "${jsonPath}"`)
  } catch {
    const gzPath = jsonPath + '.gz'
    if (fs.existsSync(gzPath)) {
      fs.renameSync(gzPath, filePath)
    } else {
      fs.writeFileSync(gzPath, dumpContent)
    }
  }
  const gzPath = jsonPath + '.gz'
  if (fs.existsSync(gzPath) && gzPath !== filePath) {
    fs.renameSync(gzPath, filePath)
  }
  const fileStats = fs.statSync(filePath)
  return { filePath, fileName, fileSize: fileStats.size, dbSize }
}

export async function uploadToIPFS(filePath: string): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_API_KEY

  if (!apiKey || !secretKey) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    return `local-${hash.slice(0, 16)}`
  }

  try {
    const form = new FormData()
    form.append('file', fs.createReadStream(filePath))

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': apiKey,
        'pinata_secret_api_key': secretKey,
      },
      body: form as unknown as BodyInit,
    })

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.IpfsHash
  } catch (error) {
    console.error('IPFS upload failed, using local hash:', error)
    const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    return `local-${hash.slice(0, 16)}`
  }
}

export function generateMagnetLink(cid: string, fileName: string): string {
  const trackers = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://tracker.leechers-paradise.org:6969/announce',
    'udp://9.rarbg.to:2710/announce',
    'udp://p4p.arenabg.com:1337/announce',
  ]

  const trackerParams = trackers.map(t => `tr=${encodeURIComponent(t)}`).join('&')
  return `magnet:?xt=urn:btih:${cid}&dn=${encodeURIComponent(fileName)}&${trackerParams}&ws=http://ipfs.io/ipfs/${cid}`
}

export async function saveBackupRecord(metadata: {
  cid: string
  magnetLink: string
  fileName: string
  fileSize: number
  dbSize: number
  userId: string
}) {
  const torrentFileName = `${metadata.fileName.replace('.sql.gz', '')}.torrent`
  saveTorrentFile(torrentFileName, metadata, BACKUP_DIR)

  const backup = await prisma.backup.create({
    data: {
      cid: metadata.cid,
      magnetLink: metadata.magnetLink,
      torrentFile: `/backups/${torrentFileName}`,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      dbSize: metadata.dbSize,
      createdById: metadata.userId,
    },
  })

  await prisma.platformSettings.updateMany({
    data: { lastBackupAt: new Date() },
  })

  return backup
}

function saveTorrentFile(fileName: string, metadata: { cid: string; fileName: string; fileSize: number }, baseDir: string) {
  const torrentPath = path.join(baseDir, fileName)
  const content = {
    ...createTorrentContent(metadata),
    createdBy: 'XistryMemz Backup System',
    creationDate: new Date().toISOString(),
  }
  fs.writeFileSync(torrentPath, JSON.stringify(content, null, 2))
}

function createTorrentContent(metadata: {
  cid: string
  fileName: string
  fileSize: number
}) {
  return {
    version: 1,
    createdBy: 'XistryMemz Backup System',
    creationDate: new Date().toISOString(),
    info: {
      name: metadata.fileName,
      length: metadata.fileSize,
      pieceLength: 262144,
      pieces: metadata.cid,
      private: false,
    },
    'ipfs-cid': metadata.cid,
    webseeds: [
      `https://ipfs.io/ipfs/${metadata.cid}`,
    ],
    announceList: [
      ['udp://tracker.opentrackr.org:1337/announce'],
      ['udp://tracker.openbittorrent.com:6969/announce'],
    ],
  }
}

export async function getBackupsList() {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  })

  return backups.map(b => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
  }))
}

export async function deleteBackup(id: string) {
  const backup = await prisma.backup.findUnique({ where: { id } })
  if (!backup) return false

  const filePath = path.join(BACKUP_DIR, backup.fileName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }

  const torrentFileName = path.basename(backup.torrentFile)
  const torrentPath = path.join(BACKUP_DIR, torrentFileName)
  if (fs.existsSync(torrentPath)) {
    fs.unlinkSync(torrentPath)
  }

  await prisma.backup.delete({ where: { id } })
  return true
}

export async function getBackupStats() {
  ensureDirectories()

  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const totalSize = backups.reduce((sum, b) => sum + b.fileSize, 0)
  let diskUsage = 0

  try {
    if (fs.existsSync(BACKUP_DIR)) {
      const files = fs.readdirSync(BACKUP_DIR)
      for (const file of files) {
        const filePath = path.join(BACKUP_DIR, file)
        if (fs.statSync(filePath).isFile()) {
          diskUsage += fs.statSync(filePath).size
        }
      }
    }
  } catch { }

  const settings = await prisma.platformSettings.findFirst()

  return {
    totalBackups: backups.length,
    totalSize,
    diskUsage,
    lastBackupAt: backups[0]?.createdAt?.toISOString() || null,
    autoBackupEnabled: settings?.enableAutoBackup || false,
    backupIntervalHours: settings?.backupIntervalHours || 24,
    backupRetentionCount: settings?.backupRetentionCount || 7,
  }
}

export async function cleanOldBackups(retentionCount: number) {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
    skip: retentionCount,
  })

  for (const backup of backups) {
    await deleteBackup(backup.id)
  }

  return backups.length
}

export function getBackupFilePath(fileName: string): string | null {
  const filePath = path.join(BACKUP_DIR, fileName)
  if (fs.existsSync(filePath)) {
    return filePath
  }
  return null
}
