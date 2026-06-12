import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) {
    return apiError("Unauthorized", 401)
  }

  try {
    const deleted = await deleteBackup(id)
    if (!deleted) {
      return apiError("Backup not found", 404)
    }
    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return apiError("Failed to delete backup", 500)
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await requireAdmin()
  if (!session) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { prisma } = await import('@/lib/prisma')
    const backup = await prisma.backup.findUnique({ where: { id } })
    if (!backup) {
      return apiError("Backup not found", 404)
    }

    const filePath = getBackupFilePath(backup.fileName)
    if (!filePath) {
      return apiError("Backup file not found on disk", 404)
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
    return apiError("Failed to download backup", 500)
  }
}
