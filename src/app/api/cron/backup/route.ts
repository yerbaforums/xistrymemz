import { apiSuccess, apiError } from '@/lib/api-helpers'
import {
  createDatabaseDump,
  uploadToIPFS,
  saveBackupRecord,
  getBackupStats,
  cleanOldBackups,
} from '@/services/backupService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Scheduled (auto) backup. Secured with CRON_SECRET, e.g.:
 *
 *   curl "https://yoursite.com/api/cron/backup?secret=$CRON_SECRET"
 *
 * or with a Bearer token. Point a cron provider (Vercel Cron,
 * GitHub Actions, cron-job.org) at this route on a schedule —
 * the same interval the admin backup settings describe.
 */
async function requireCronSecret(request: Request): Promise<boolean> {
  const configured = process.env.CRON_SECRET
  if (!configured) return false
  const url = new URL(request.url)
  const supplied =
    url.searchParams.get('secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''
  return supplied === configured
}

export async function GET(request: Request) {
  if (!(await requireCronSecret(request))) {
    return apiError('Unauthorized', 401)
  }

  try {
    // Cron jobs have no signed-in user, but the Backup row
    // requires a creator — attribute it to the first admin.
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) {
      return apiError('No admin user found to attribute the backup to', 500)
    }

    const dump = await createDatabaseDump()
    const cid = await uploadToIPFS(dump.filePath)

    await saveBackupRecord({
      cid,
      fileName: dump.fileName,
      fileSize: dump.fileSize,
      dbSize: dump.dbSize,
      userId: admin.id,
    })

    const retentionCount = await getBackupStats().then(s => s.backupRetentionCount)
    const deleted = await cleanOldBackups(retentionCount)

    return apiSuccess({ success: true, cid, deletedOldBackups: deleted })
  } catch (error) {
    console.error('Cron backup failed:', error)
    const message = error instanceof Error ? error.message : 'Cron backup failed'
    return apiError(message, 500)
  }
}
