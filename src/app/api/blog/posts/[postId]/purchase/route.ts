import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

// GET purchase/subscription state for a post (viewer + owner pending list)
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title: true, blogId: true, visibility: true, tier: true, price: true, currency: true },
  })
  if (!post) return apiError('Post not found', 404)
  const isOwner = post.blogId === userId

  const [mine, pending] = await Promise.all([
    prisma.blogPostPurchase.findFirst({ where: { postId, userId }, orderBy: { createdAt: 'desc' } }),
    isOwner
      ? prisma.blogPostPurchase.findMany({
          where: { postId, status: 'PENDING' },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([]),
  ])

  return apiSuccess({ purchase: mine, isOwner, pending })
}

// POST request purchase (self-reported crypto, like school content)
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: {
      id: true, title: true, slug: true, visibility: true, tier: true, price: true, currency: true,
      blog: { select: { id: true, blogSlug: true } },
    },
  })
  if (!post) return apiError('Post not found', 404)
  if (post.blog.id === userId) return apiError('This is your post', 400)

  // Gate: only SUBSCRIBERS/PAID posts require a purchase
  if (post.visibility === 'FREE') return apiError('This post is free — no purchase needed', 400)

  const existing = await prisma.blogPostPurchase.findFirst({
    where: { postId, userId, status: { in: ['PENDING', 'COMPLETED'] } },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) return apiSuccess(existing)

  const body = await request.json().catch(() => ({}) as { txHash?: string })
  const price = post.price || 0

  const purchase = await prisma.blogPostPurchase.create({
    data: {
      postId,
      userId,
      amount: price,
      currency: post.currency || 'USD',
      status: 'PENDING',
      txHash: body.txHash || null,
    },
  })

  try {
    await createNotification({
      type: 'SYSTEM',
      userId: post.blog.id,
      message: `${session.user.name || 'Someone'} requested access to "${post.title}"`,
      link: `/blog/${post.blog.blogSlug}/${post.slug}`,
    } as never)
  } catch { /* non-fatal */ }

  return apiSuccess(purchase)
}

// PATCH owner confirm: { purchaseId, action: approve | cancel }
export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title: true, slug: true, blogId: true, blog: { select: { blogSlug: true } } },
  })
  if (!post || post.blogId !== userId) return apiError('Forbidden', 403)

  const body = await request.json().catch(() => ({}) as { purchaseId?: string; action?: string })
  if (!body.purchaseId || !['approve', 'cancel'].includes(body.action || '')) {
    return apiError('purchaseId and action (approve|cancel) required', 400)
  }

  const purchase = await prisma.blogPostPurchase.findFirst({ where: { id: body.purchaseId, postId } })
  if (!purchase) return apiError('Purchase not found', 404)

  const updated = await prisma.blogPostPurchase.update({
    where: { id: purchase.id },
    data: { status: body.action === 'approve' ? 'COMPLETED' : 'REFUNDED' },
  })

  if (body.action === 'approve') {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: purchase.userId,
        message: `Your access to "${post.title}" was approved — enjoy!`,
        link: `/blog/${post.blog.blogSlug}/${post.slug}`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(updated)
}