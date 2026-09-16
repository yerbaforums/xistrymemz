import { apiSuccess, apiError, apiUnauthorized, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sponsorshipCompleteSchema, validateBody } from '@/lib/schemas'
import { createNotification } from '@/services/notificationService'

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

async function ownerOf(entityType: string, entityId: string): Promise<{ ownerId: string | null; title: string }> {
  try {
    if (entityType === 'REQUEST') {
      const r = await prisma.request.findUnique({ where: { id: entityId }, select: { userId: true, title: true } })
      return { ownerId: r?.userId || null, title: r?.title || 'a request' }
    }
    if (entityType === 'SCHOOL') {
      const u = await prisma.user.findUnique({ where: { id: entityId }, select: { schoolName: true, name: true } })
      return { ownerId: entityId, title: u?.schoolName || u?.name || 'a school' }
    }
    const p = await prisma.project.findUnique({ where: { id: entityId }, select: { userId: true, title: true } })
    const row = p as { userId?: string; title?: string } | null
    return { ownerId: row?.userId || null, title: row?.title || 'a project' }
  } catch {
    return { ownerId: null, title: 'a request' }
  }
}

// POST /api/sponsorships/[id]/complete { txHash?, note? } — self-reported donation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { id } = await params

  const sponsorship = await prisma.sponsorship.findUnique({ where: { id } })
  if (!sponsorship || sponsorship.sponsorId !== userId) return apiError('Sponsorship not found', 404)
  if (sponsorship.status === 'CANCELLED') return apiError('This sponsorship was cancelled', 400)

  let body: unknown
  try { body = await request.json().catch(() => ({})) } catch { body = {} }
  const validation = validateBody(sponsorshipCompleteSchema, body || {})
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 })

  const payment = await prisma.sponsorshipPayment.create({
    data: {
      sponsorshipId: id,
      amount: sponsorship.amount,
      txHash: validation.data.txHash || null,
      note: validation.data.note || null,
    },
  })

  const updated = await prisma.sponsorship.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      lastCompletedAt: new Date(),
      nextReminderAt: new Date(Date.now() + MONTH_MS),
    },
  })

  const { ownerId, title } = await ownerOf(sponsorship.entityType, sponsorship.entityId)
  if (ownerId && ownerId !== userId) {
    try {
      await createNotification({
        type: 'SPONSORSHIP_RECEIVED',
        userId: ownerId,
        message: `${session.user.name || 'A sponsor'} reported their monthly sponsorship (${sponsorship.amount} ${sponsorship.currency}) for "${title}"`,
        link: `/dashboard/sponsorships?view=incoming`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess({ sponsorship: updated, payment })
}
