import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

// GET subscription state via ?userId= (owner view) or self
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const viewerId = session.user.id as string
  const { slug } = await params

  const blog = await prisma.user.findFirst({
    where: { blogSlug: slug },
    select: { id: true, blogTiers: true },
  })
  if (!blog) return apiError('Blog not found', 404)

  const { searchParams } = new URL(request.url)
  const targetId = searchParams.get('userId') || viewerId
  const isOwner = blog.id === viewerId
  if (targetId !== viewerId && !isOwner) return apiError('Forbidden', 403)

  const mine = await prisma.blogSubscription.findFirst({
    where: { blogId: blog.id, subscriberId: targetId },
    orderBy: { createdAt: 'desc' },
  })

  let pending: unknown[] = []
  if (isOwner) {
    pending = await prisma.blogSubscription.findMany({
      where: { blogId: blog.id, status: 'PENDING' },
      include: { subscriber: { select: { id: true, name: true, image: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  return apiSuccess({ subscription: mine, isOwner, pending, blogTiers: blog.blogTiers })
}

// POST subscribe { tier: 'FREE' | tierId, price, currency, txHash?, expiresInDays? }
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const viewerId = session.user.id as string
  const { slug } = await params

  const blog = await prisma.user.findFirst({
    where: { blogSlug: slug },
    select: { id: true, blogTiers: true, blogName: true },
  })
  if (!blog) return apiError('Blog not found', 404)
  if (blog.id === viewerId) return apiError('You cannot subscribe to your own blog', 400)

  const body = await request.json().catch(() => ({}) as { tier?: string; price?: number; currency?: string; txHash?: string; expiresInDays?: number })
  const tier = body.tier || 'FREE'

  // Validate paid tier against configured tiers
  let price = 0
  let currency = 'USD'
  let expiresAt: Date | null = null
  if (tier !== 'FREE') {
    let tiers: Array<{ id: string; name: string; price: number; currency?: string; expiresInDays?: number }> = []
    try {
      tiers = blog.blogTiers ? JSON.parse(blog.blogTiers) : []
    } catch { tiers = [] }
    const found = tiers.find((t) => t.id === tier)
    if (!found) return apiError('Invalid tier', 400)
    price = Number(body.price) || found.price || 0
    currency = found.currency || 'USD'
    const days = Number(body.expiresInDays) || found.expiresInDays || 30
    expiresAt = new Date(Date.now() + days * 86400000)
  }

  const existing = await prisma.blogSubscription.findFirst({
    where: { blogId: blog.id, subscriberId: viewerId },
    orderBy: { createdAt: 'desc' },
  })

  let subscription
  if (existing && existing.status === 'ACTIVE') {
    if (tier === 'FREE') return apiSuccess(existing) // already subscribed free
    // Upgrade: bump existing to chosen tier
    subscription = await prisma.blogSubscription.update({
      where: { id: existing.id },
      data: {
        tier, price, currency,
        status: body.txHash ? 'ACTIVE' : 'PENDING',
        txHash: body.txHash || null,
        expiresAt,
        startedAt: body.txHash ? new Date() : existing.startedAt,
      },
    })
  } else if (existing && existing.status === 'PENDING') {
    subscription = await prisma.blogSubscription.update({
      where: { id: existing.id },
      data: {
        tier, price, currency,
        txHash: body.txHash || existing.txHash,
        expiresAt,
      },
    })
  } else {
    subscription = await prisma.blogSubscription.create({
      data: {
        blogId: blog.id,
        subscriberId: viewerId,
        tier,
        price,
        currency,
        status: body.txHash || tier === 'FREE' ? 'ACTIVE' : 'PENDING',
        txHash: body.txHash || null,
        expiresAt: tier === 'FREE' ? null : expiresAt,
      },
    })
  }

  if (body.txHash && subscription.status === 'ACTIVE') {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: blog.id,
        message: `${session.user.name || 'Someone'} subscribed to "${blog.blogName || 'your blog'}" (${tier})`,
        link: `/dashboard/blog`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(subscription)
}

// PATCH owner confirm: { subscriptionId, action: approve | cancel }
export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { slug } = await params

  const blog = await prisma.user.findFirst({ where: { blogSlug: slug }, select: { id: true, blogName: true } })
  if (!blog || blog.id !== userId) return apiError('Forbidden', 403)

  const body = await request.json().catch(() => ({}) as { subscriptionId?: string; action?: string })
  if (!body.subscriptionId || !['approve', 'cancel'].includes(body.action || '')) {
    return apiError('subscriptionId and action (approve|cancel) required', 400)
  }

  const sub = await prisma.blogSubscription.findFirst({ where: { id: body.subscriptionId, blogId: blog.id } })
  if (!sub) return apiError('Subscription not found', 404)

  const updated = await prisma.blogSubscription.update({
    where: { id: sub.id },
    data: {
      status: body.action === 'approve' ? 'ACTIVE' : 'CANCELLED',
      startedAt: body.action === 'approve' ? new Date() : sub.startedAt,
    },
  })

  if (body.action === 'approve') {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: sub.subscriberId,
        message: `Your subscription to "${blog.blogName || 'the blog'}" was approved — new posts are unlocked!`,
        link: `/blog/${slug}`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(updated)
}

// DELETE unsubscribe
export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const viewerId = session.user.id as string
  const { slug } = await params

  const blog = await prisma.user.findFirst({ where: { blogSlug: slug }, select: { id: true } })
  if (!blog) return apiError('Blog not found', 404)

  await prisma.blogSubscription.updateMany({
    where: { blogId: blog.id, subscriberId: viewerId, status: { in: ['ACTIVE', 'PENDING'] } },
    data: { status: 'CANCELLED' },
  })

  return apiSuccess({ success: true })
}