import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

// POST /api/sponsorships/[id]/skip — snooze this month's reminder
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { id } = await params

  const sponsorship = await prisma.sponsorship.findUnique({ where: { id } })
  if (!sponsorship || sponsorship.sponsorId !== userId) return apiError('Sponsorship not found', 404)
  if (sponsorship.status === 'CANCELLED') return apiError('This sponsorship was cancelled', 400)

  const base = Math.max(sponsorship.nextReminderAt.getTime(), Date.now())
  const updated = await prisma.sponsorship.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      nextReminderAt: new Date(base + MONTH_MS),
      skipCount: { increment: 1 },
    },
  })
  return apiSuccess(updated)
}
