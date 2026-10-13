import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteBackup, getBackupFilePath } from '@/services/backupService'
import { ipfsGatewayUrl } from '@/lib/ipfs'

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

    // Serverless note: local backup files live in ephemeral
    // storage, so on platforms like Vercel the file may only
    // exist on the instance that created it. The durable copy
    // is the IPFS-pinned version — fall back to the gateway.
    if (!filePath) {
      const cid = backup.cid || ''
      const isRealCid = cid && !cid.startsWith('local-') && /^[a-zA-Z0-9]+$/.test(cid)
      if (isRealCid) {
        return NextResponse.redirect(ipfsGatewayUrl(cid), 302)
      }
      return apiError(
        'Local-only backup (no durable IPFS copy) — set PINATA_API_KEY / PINATA_SECRET_API_KEY and take a new backup. This file is only available on the instance that created it.',
        404,
      )
    }

    const fs = require('fs')
    const stat = fs.statSync(filePath)
    const fileStream = fs.createReadStream(filePath)

    return new NextResponse(fileStream as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${backup.fileName}"`,
        'Content-Length': String(stat.size),
      },
    })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return apiError("Failed to download backup", 500)
  }
}
