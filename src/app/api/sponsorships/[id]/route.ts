import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH { status: ACTIVE | PAUSED | CANCELLED } — sponsor owns the pledge
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { id } = await params

  const sponsorship = await prisma.sponsorship.findUnique({ where: { id } })
  if (!sponsorship || sponsorship.sponsorId !== userId) return apiError('Sponsorship not found', 404)

  let body: { status?: string }
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
  const status = body.status
  if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status || '')) return apiError('Invalid status', 400)

  const updated = await prisma.sponsorship.update({
    where: { id },
    data: {
      status,
      // resuming restarts the monthly clock now; pausing freezes it
      nextReminderAt: status === 'ACTIVE' && sponsorship.status !== 'ACTIVE' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : sponsorship.nextReminderAt,
    },
  })
  return apiSuccess(updated)
}
