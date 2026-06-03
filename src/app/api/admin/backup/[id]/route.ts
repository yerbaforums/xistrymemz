import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteBackup, getBackupFilePath } from '@/services/backupService'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return null
  }
  return session
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const deleted = await deleteBackup(params.id)
    if (!deleted) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json({ error: 'Failed to delete backup' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const backup = await prisma.backup.findUnique({ where: { id: params.id } })
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const filePath = getBackupFilePath(backup.fileName)
    if (!filePath) {
      return NextResponse.json({ error: 'Backup file not found on disk' }, { status: 404 })
    }

    const fs = require('fs')
    const fileBuffer = fs.readFileSync(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backup.fileName}"`,
        'Content-Length': String(fileBuffer.length),
      },
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json({ error: 'Failed to download backup' }, { status: 500 })
  }
}
