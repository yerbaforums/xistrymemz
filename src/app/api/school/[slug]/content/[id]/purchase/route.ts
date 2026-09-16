import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

// GET purchase status: mine, plus pending list for the owner
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { id } = await params

  const content = await prisma.schoolContent.findUnique({
    where: { id },
    select: { id: true, userId: true, isPaid: true },
  })
  if (!content) return apiError('Not found', 404)
  const isOwner = content.userId === userId

  const mine = await prisma.schoolPurchase.findFirst({
    where: { contentId: id, userId },
    orderBy: { createdAt: 'desc' },
  })

  let pending: unknown[] = []
  if (isOwner) {
    pending = await prisma.schoolPurchase.findMany({
      where: { contentId: id, status: 'PENDING' },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  return apiSuccess({ purchase: mine, isOwner, pending })
}

// POST request purchase (self-reported crypto, like event tickets)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { slug, id } = await params

  const content = await prisma.schoolContent.findUnique({
    where: { id },
    select: { id: true, title: true, userId: true, isPaid: true, price: true, currency: true },
  })
  if (!content) return apiError('Not found', 404)
  if (content.userId === userId) return apiError('This is your content', 400)

  const existing = await prisma.schoolPurchase.findFirst({
    where: { contentId: id, userId, status: { in: ['PENDING', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return apiSuccess(existing)

  let body: { txHash?: string; note?: string } = {}
  try { body = await request.json() } catch { /* optional */ }

  const purchase = await prisma.schoolPurchase.create({
    data: {
      type: 'CONTENT',
      amount: content.isPaid ? content.price : 0,
      currency: content.currency,
      status: content.isPaid ? 'PENDING' : 'COMPLETED',
      txHash: body.txHash || null,
      userId,
      contentId: id,
    },
  })

  if (content.isPaid) {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: content.userId,
        message: `${session.user.name || 'Someone'} requested access to "${content.title}" ($${content.price})`,
        link: `/school/${slug}/content/${id}`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(purchase)
}

// PATCH owner confirm: { purchaseId, action: approve | cancel }
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { slug, id } = await params

  const content = await prisma.schoolContent.findUnique({ where: { id }, select: { userId: true, title: true } })
  if (!content || content.userId !== userId) return apiError('Forbidden', 403)

  let body: { purchaseId?: string; action?: string }
  try { body = await request.json() } catch { return apiError('Invalid JSON body', 400) }
  if (!body.purchaseId || !['approve', 'cancel'].includes(body.action || '')) {
    return apiError('purchaseId and action (approve|cancel) required', 400)
  }

  const purchase = await prisma.schoolPurchase.findFirst({ where: { id: body.purchaseId, contentId: id } })
  if (!purchase) return apiError('Purchase not found', 404)

  const updated = await prisma.schoolPurchase.update({
    where: { id: purchase.id },
    data: { status: body.action === 'approve' ? 'COMPLETED' : 'CANCELLED' },
  })

  if (body.action === 'approve') {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: purchase.userId,
        message: `Your access to "${content.title}" was approved — enjoy!`,
        link: `/school/${slug}/content/${id}`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(updated)
}
