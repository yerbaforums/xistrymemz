import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  createDatabaseDump,
  uploadToIPFS,
  generateMagnetLink,
  saveBackupRecord,
  getBackupsList,
  getBackupStats,
  cleanOldBackups,
} from '@/services/backupService'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET(request: Request) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode')

    if (mode === 'stats') {
      const stats = await getBackupStats()
      return NextResponse.json(stats)
    }

    const backups = await getBackupsList()
    return NextResponse.json({ backups })
  } catch (error) {
    console.error('Error fetching backups:', error)
    return NextResponse.json({ error: 'Failed to fetch backups' }, { status: 500 })
  }
}

export async function POST() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dump = await createDatabaseDump()

    const cid = await uploadToIPFS(dump.filePath)
    const magnetLink = generateMagnetLink(cid, dump.fileName)

    const backup = await saveBackupRecord({
      cid,
      magnetLink,
      fileName: dump.fileName,
      fileSize: dump.fileSize,
      dbSize: dump.dbSize,
      userId: session.user.id,
    })

    const retentionCount = await getBackupStats().then(s => s.backupRetentionCount)
    const deleted = await cleanOldBackups(retentionCount)

    return NextResponse.json({
      success: true,
      backup: {
        ...backup,
        createdAt: backup.createdAt.toISOString(),
      },
      deletedOldBackups: deleted,
    })
  } catch (error) {
    console.error('Error creating backup:', error)
    const message = error instanceof Error ? error.message : 'Failed to create backup'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
