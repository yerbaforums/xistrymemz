import { apiSuccess, apiError, apiUnauthorized, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sponsorshipSchema, validateBody } from '@/lib/schemas'

async function entityTitle(entityType: string, entityId: string): Promise<string | null> {
  try {
    if (entityType === 'REQUEST') {
      const r = await prisma.request.findUnique({ where: { id: entityId }, select: { title: true } })
      return r?.title || null
    }
    const p = await prisma.project.findUnique({ where: { id: entityId }, select: { title: true } })
    return (p as { title?: string } | null)?.title || null
  } catch {
    return null
  }
}

async function entityOwner(entityType: string, entityId: string): Promise<string | null> {
  try {
    if (entityType === 'REQUEST') {
      const r = await prisma.request.findUnique({ where: { id: entityId }, select: { userId: true } })
      return r?.userId || null
    }
    const p = await prisma.project.findUnique({ where: { id: entityId }, select: { userId: true } })
    return (p as { userId?: string } | null)?.userId || null
  } catch {
    return null
  }
}

// GET ?view=mine|incoming — outgoing pledges or sponsorships toward my requests/projects
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { searchParams } = new URL(request.url)
  const view = searchParams.get('view') || 'mine'

  if (view === 'incoming') {
    const [myRequests, myProjects] = await Promise.all([
      prisma.request.findMany({ where: { userId }, select: { id: true, title: true } }),
      prisma.project.findMany({ where: { userId } as Record<string, unknown>, select: { id: true, title: true } }),
    ])
    const entityIds = [...myRequests.map(r => r.id), ...myProjects.map(p => p.id)]
    if (entityIds.length === 0) return apiSuccess({ items: [], totals: { sponsors: 0, monthlyPledged: 0, received: 0 } })
    const sponsorships = await prisma.sponsorship.findMany({
      where: { entityId: { in: entityIds }, status: { not: 'CANCELLED' } },
      include: {
        sponsor: { select: { id: true, name: true, image: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    const titleById = new Map([...myRequests.map(r => [r.id, r.title] as const), ...myProjects.map(p => [p.id, (p as { title?: string }).title || 'Untitled'] as const)])
    const items = sponsorships.map(s => ({
      ...s,
      entityTitle: titleById.get(s.entityId) || 'Untitled',
      lifetimeReceived: s.payments.reduce((sum, p) => sum + p.amount, 0),
    }))
    const active = sponsorships.filter(s => s.status === 'ACTIVE')
    return apiSuccess({
      items,
      totals: {
        sponsors: new Set(active.map(s => s.sponsorId)).size,
        monthlyPledged: active.reduce((sum, s) => sum + s.amount, 0),
        received: sponsorships.flatMap(s => s.payments).reduce((sum, p) => sum + p.amount, 0),
      },
    })
  }

  const sponsorships = await prisma.sponsorship.findMany({
    where: { sponsorId: userId },
    include: { payments: { select: { amount: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { createdAt: 'desc' },
  })
  const items = await Promise.all(sponsorships.map(async s => ({
    ...s,
    entityTitle: await entityTitle(s.entityType, s.entityId),
    lifetimeGiven: undefined as never,
  })))
  const givenTotals = await prisma.sponsorshipPayment.findMany({
    where: { sponsorship: { sponsorId: userId } },
    select: { amount: true },
  })
  return apiSuccess({
    items,
    totals: {
      active: sponsorships.filter(s => s.status === 'ACTIVE').length,
      monthlyPledged: sponsorships.filter(s => s.status === 'ACTIVE').reduce((sum, s) => sum + s.amount, 0),
      lifetimeGiven: givenTotals.reduce((sum, p) => sum + p.amount, 0),
    },
  })
}

// POST pledge { entityType, entityId, amount, currency? }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string

  let body: unknown
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
  const validation = validateBody(sponsorshipSchema, body)
  if (!validation.success) return NextResponse.json({ error: validation.error }, { status: 400 })
  const { entityType, entityId, amount, currency } = validation.data

  const ownerId = await entityOwner(entityType, entityId)
  if (!ownerId) return apiError('Request or project not found', 404)
  if (ownerId === userId) return apiError('You cannot sponsor your own request or project', 400)

  const existing = await prisma.sponsorship.findUnique({
    where: { sponsorId_entityType_entityId: { sponsorId: userId, entityType, entityId } },
  })
  if (existing) {
    if (existing.status === 'CANCELLED') {
      const revived = await prisma.sponsorship.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', amount, currency: currency || existing.currency, nextReminderAt: new Date() },
      })
      return apiSuccess(revived)
    }
    return apiError('You already sponsor this. Manage it from your sponsorships.', 409)
  }

  const sponsorship = await prisma.sponsorship.create({
    data: {
      sponsorId: userId,
      entityType,
      entityId,
      amount,
      currency: currency || 'XMR',
      nextReminderAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  return apiSuccess(sponsorship)
}
