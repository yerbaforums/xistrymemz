import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import os from 'os'
import { promisify } from 'util'
import { ipfsGatewayUrl } from '@/lib/ipfs'

const execAsync = promisify(exec)

let resolvedBackupDir: string | null = null

function getBackupDir(): string {
  if (resolvedBackupDir) return resolvedBackupDir

  // Prefer the persistent, in-repo backups/ directory (self-hosted /
  // Docker). On read-only serverless filesystems (Vercel) the probe
  // write below fails and we fall back to /tmp, which is the only
  // writable location there — durability then comes from the
  // IPFS-pinned copy (see the download route).
  const persistent = path.join(process.cwd(), 'backups')
  try {
    fs.mkdirSync(persistent, { recursive: true })
    const probe = path.join(persistent, '.write-probe')
    fs.writeFileSync(probe, '')
    fs.unlinkSync(probe)
    resolvedBackupDir = persistent
  } catch {
    const tmp = path.join(os.tmpdir(), 'backups')
    fs.mkdirSync(tmp, { recursive: true })
    resolvedBackupDir = tmp
  }
  return resolvedBackupDir
}

function ensureBackupDirs() {
  getBackupDir()
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
    'User', 'Project', 'Request', 'Product', 'Event', 'ServiceOffering', 'Group',
    'BulletinBoard', 'BulletinPin', 'Post', 'ForumPost', 'ForumReply',
    'SchoolContent', 'Notification', 'Message', 'Connection', 'Comment',
    'ProjectUpdate', 'ProjectUpdateComment', 'Payment', 'EscrowTransaction',
    'BarterOffer', 'Appointment', 'Availability', 'Backlink', 'Hashtag',
    'VideoRoom', 'InviteCode', 'Backup',
  ]
  const data: Record<string, unknown[]> = {}
  for (const name of modelNames) {
    try {
      const model = (prisma as unknown as Record<string, { findMany?: () => Promise<unknown[]> }>)[name.toLowerCase()]
      if (model?.findMany) {
        data[name] = await model.findMany()
      }
    } catch {}
  }
  return JSON.stringify(data, null, 2)
}

// ── Encryption ──────────────────────────────────────────────────────
// Every dump is encrypted before it touches disk or IPFS, so a
// leaked CID only ever exposes ciphertext. File layout:
//   [16-byte scrypt salt][12-byte IV][16-byte GCM auth tag][ciphertext]
// The key is derived with scrypt from BACKUP_ENCRYPTION_KEY. GCM's
// auth tag doubles as tamper detection — a corrupted or modified
// backup fails to decrypt instead of restoring silently.

function getBackupPassphrase(): string {
  const passphrase = process.env.BACKUP_ENCRYPTION_KEY
  if (!passphrase) {
    throw new Error(
      'BACKUP_ENCRYPTION_KEY is not set — refusing to create an unencrypted backup. Generate one with: openssl rand -base64 32',
    )
  }
  return passphrase
}

function encryptFile(plainPath: string): string {
  const passphrase = getBackupPassphrase()
  const salt = crypto.randomBytes(16)
  const iv = crypto.randomBytes(12)
  const key = crypto.scryptSync(passphrase, salt, 32)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const input = fs.readFileSync(plainPath)
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()])
  const tag = cipher.getAuthTag()

  const encPath = `${plainPath}.enc`
  fs.writeFileSync(encPath, Buffer.concat([salt, iv, tag, encrypted]))
  fs.unlinkSync(plainPath) // never leave plaintext on disk
  return encPath
}

/** Decrypt a backup file (same layout as encryptFile). */
export function decryptBackupFile(encPath: string): Buffer {
  const passphrase = getBackupPassphrase()
  const data = fs.readFileSync(encPath)
  const salt = data.subarray(0, 16)
  const iv = data.subarray(16, 28)
  const tag = data.subarray(28, 44)
  const ciphertext = data.subarray(44)
  const key = crypto.scryptSync(passphrase, salt, 32)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Create a database dump. The raw dump is produced by
 * createPlainDump (pg_dump, sqlite, or a Prisma JSON fallback)
 * and encrypted before anything else sees it — the file on disk,
 * the IPFS-pinned copy, and every download are all ciphertext.
 */
export async function createDatabaseDump(): Promise<{
  filePath: string
  fileName: string
  fileSize: number
  dbSize: number
}> {
  const dump = await createPlainDump()
  const encPath = encryptFile(dump.filePath)
  const stats = fs.statSync(encPath)
  return {
    filePath: encPath,
    fileName: `${dump.fileName}.enc`,
    fileSize: stats.size,
    dbSize: dump.dbSize,
  }
}

async function createPlainDump(): Promise<{
  filePath: string
  fileName: string
  fileSize: number
  dbSize: number
}> {
  ensureBackupDirs()

  const timestamp = getTimestamp()
  const fileName = `backup-${timestamp}.sql.gz`
  const filePath = path.join(getBackupDir(), fileName)

  let dbSize = 0

  const pgDumpPath = findPgDump()
  const dbType = getDbType()

  if (dbType === 'postgresql' && pgDumpPath) {
    try {
      const dumpFile = path.join(getBackupDir(), `backup-${timestamp}.sql`)
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
      await execAsync(`sqlite3 "${dbPath}" ".backup '${path.join(getBackupDir(), `backup-${timestamp}.db`)}'"`)
      await execAsync(`gzip -c "${path.join(getBackupDir(), `backup-${timestamp}.db`)}" > "${filePath}"`)
      fs.unlinkSync(path.join(getBackupDir(), `backup-${timestamp}.db`))
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

/** Fallback CID for backups that were not pinned (no credentials or upload failure). */
function localCid(filePath: string): string {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
  return `local-${hash.slice(0, 16)}`
}

export async function uploadToIPFS(filePath: string): Promise<string> {
  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_API_KEY

  // Target 1 — managed pinning (Pinata) when credentials exist.
  if (apiKey && secretKey) {
    try {
      return await pinToPinata(filePath, apiKey, secretKey)
    } catch (error) {
      console.error('Pinata upload failed — trying the next backup target:', error)
    }
  }

  // Target 2 — an admin's own IPFS node (IPFS_PIN_URL). Raw kubo
  // RPC over HTTP, so no client dependency is needed. Decentralized
  // durability without a third party.
  const pinUrl = process.env.IPFS_PIN_URL
  if (pinUrl) {
    try {
      return await pinToOwnNode(filePath, pinUrl)
    } catch (error) {
      console.error('Own-node pinning failed — storing local-only:', error)
    }
  }

  // No durable target — local-only, flagged in the admin table.
  console.warn(
    'No backup target configured (PINATA_API_KEY/PINATA_SECRET_API_KEY or IPFS_PIN_URL) — backup stored as local-only with no durable copy.',
  )
  return localCid(filePath)
}

async function pinToPinata(filePath: string, apiKey: string, secretKey: string): Promise<string> {
  // Native FormData + Blob: let fetch set the multipart Content-Type itself.
  // (The previous implementation called form-data's getHeaders() on the native
  // FormData, which throws on every upload and silently degraded every backup
  // to a local- CID even with valid keys.)
  const buffer = fs.readFileSync(filePath)
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(buffer)]), path.basename(filePath))

  const headers: Record<string, string> = {}
  if (apiKey.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${apiKey}`
  } else {
    headers.pinata_api_key = apiKey
    headers.pinata_secret_api_key = secretKey
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Pinata upload failed (${response.status}): ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  return data.IpfsHash as string
}

async function pinToOwnNode(filePath: string, url: string): Promise<string> {
  // POST /api/v0/add?pin=true — adds and pins in one call on any
  // kubo-compatible node. The response shape varies slightly by version.
  const buffer = fs.readFileSync(filePath)
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(buffer)]), path.basename(filePath))

  const response = await fetch(`${url.replace(/\/+$/, '')}/api/v0/add?pin=true`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`IPFS node add failed (${response.status}): ${errText.slice(0, 200)}`)
  }

  const data = await response.json()
  const cid = data.Cid?.['/'] || data.Hash || data.cid
  if (typeof cid !== 'string' || !cid) {
    throw new Error('IPFS node returned no CID')
  }
  return cid
}

export async function saveBackupRecord(metadata: {
  cid: string
  fileName: string
  fileSize: number
  dbSize: number
  userId: string
}) {
  // Torrent linking was removed: magnet URIs announced the dump to
  // public BitTorrent trackers with an IPFS webseed — the leakiest
  // possible channel for a private database dump. The columns stay
  // non-null in the schema, so they are simply left empty.
  const backup = await prisma.backup.create({
    data: {
      cid: metadata.cid,
      magnetLink: '',
      torrentFile: '',
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

export async function getBackupsList() {
  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  })

  return backups.map(b => ({
    ...b,
    encrypted: b.fileName.endsWith('.enc'),
    gatewayUrl: ipfsGatewayUrl(b.cid),
    createdAt: b.createdAt.toISOString(),
  }))
}

export async function deleteBackup(id: string) {
  const backup = await prisma.backup.findUnique({ where: { id } })
  if (!backup) return false

  const filePath = getBackupFilePath(backup.fileName)
  if (filePath) {
    fs.unlinkSync(filePath)
  }

  // Also remove the durable copy — otherwise the ciphertext (or a
  // pre-encryption plaintext dump) stays pinned on Pinata forever,
  // still fetchable by anyone holding the CID.
  await unpinRemote(backup.cid)

  await prisma.backup.delete({ where: { id } })
  return true
}

/**
 * Unpin a CID from wherever it might be pinned (Pinata and/or the
 * admin's own IPFS node). Best-effort: failures are logged but do
 * not block the local delete — a stray pin can always be removed
 * from the Pinata dashboard or with `ipfs pin rm`. cleanOldBackups()
 * routes through here too, so retention genuinely frees remote
 * storage instead of just hiding rows.
 */
async function unpinRemote(cid: string): Promise<void> {
  if (!cid || cid.startsWith('local-')) return

  const apiKey = process.env.PINATA_API_KEY
  const secretKey = process.env.PINATA_SECRET_API_KEY
  if (apiKey && secretKey) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${apiKey}`
    } else {
      headers.pinata_api_key = apiKey
      headers.pinata_secret_api_key = secretKey
    }
    try {
      const response = await fetch('https://api.pinata.cloud/pinning/removePinFromIPFS', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ipfsPinHash: cid }),
      })
      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        console.error(`Pinata unpin failed (${response.status}) for ${cid}: ${errText.slice(0, 200)}`)
      }
    } catch (error) {
      console.error('Pinata unpin request failed:', error)
    }
  }

  const pinUrl = process.env.IPFS_PIN_URL
  if (pinUrl) {
    try {
      const response = await fetch(
        `${pinUrl.replace(/\/+$/, '')}/api/v0/pin/rm?arg=${encodeURIComponent(cid)}`,
        { method: 'POST' },
      )
      if (!response.ok) {
        console.error(`Own-node unpin failed (${response.status}) for ${cid}`)
      }
    } catch (error) {
      console.error('Own-node unpin request failed:', error)
    }
  }
}

export async function getBackupStats() {
  ensureBackupDirs()

  const backups = await prisma.backup.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const totalSize = backups.reduce((sum, b) => sum + b.fileSize, 0)
  let diskUsage = 0

  try {
    if (fs.existsSync(getBackupDir())) {
      const files = fs.readdirSync(getBackupDir())
      for (const file of files) {
        const filePath = path.join(getBackupDir(), file)
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
  // Reject anything that is not a plain file name so a crafted
  // value cannot escape the backup directory.
  if (!fileName || path.basename(fileName) !== fileName) return null

  const candidates = [
    path.join(getBackupDir(), fileName),
    path.join(process.cwd(), 'backups', fileName),
    path.join(process.cwd(), 'public', 'backups', fileName),
    path.join(os.tmpdir(), fileName),
  ]
  for (const fp of candidates) {
    if (fs.existsSync(fp)) return fp
  }
  return null
}
