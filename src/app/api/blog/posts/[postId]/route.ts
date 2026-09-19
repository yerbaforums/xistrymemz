import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET single post by id — paywalled content redacted for non-owners/outers
export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params
  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    include: {
      blog: { select: { id: true, blogName: true, blogSlug: true, blogImage: true, blogTagline: true, name: true, image: true } },
      _count: { select: { likes: true, purchases: true, tips: true } },
    },
  })
  if (!post) return apiError('Post not found', 404)

  const session = await getServerSession(authOptions)
  const viewerId = session?.user?.id as string | undefined
  const isOwner = !!viewerId && viewerId === post.blogId

  // Unpublished posts are only visible to the owner
  if (post.status !== 'PUBLISHED' && !isOwner) return apiError('Post not found', 404)

  // Access determination
  let hasAccess = isOwner || post.visibility === 'FREE'
  let subscription = null
  let liked = false

  if (!hasAccess && viewerId) {
    const [sub, purchase] = await Promise.all([
      prisma.blogSubscription.findFirst({
        where: { blogId: post.blogId, subscriberId: viewerId, status: 'ACTIVE' },
      }),
      prisma.blogPostPurchase.findFirst({
        where: { postId, userId: viewerId, status: 'COMPLETED' },
      }),
    ])
    if (sub) {
      // SUBSCRIBERS gate: any active sub unlocks. PAID gate: requires matching tier if set.
      const isSubscriberUnlock = post.visibility === 'SUBSCRIBERS' ||
        (post.visibility === 'PAID' && post.tier && sub.tier === post.tier)
      if (isSubscriberUnlock) {
        hasAccess = true
        subscription = sub
      }
    }
    if (!hasAccess && purchase) hasAccess = true
  }

  if (viewerId) {
    const like = await prisma.blogPostLike.findUnique({
      where: { postId_userId: { postId, userId: viewerId } },
      select: { id: true },
    })
    liked = !!like
  }

  // Record a view (increment counter, fire-and-forget)
  if (!isOwner) {
    await prisma.blogPost.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } }).catch(() => {})
  }

  return apiSuccess({
    ...post,
    content: hasAccess ? post.content : post.content.slice(0, 300),
    locked: !hasAccess,
    isOwner,
    liked,
    subscription,
  })
}

// PUT update a post (owner only)
export async function PUT(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const existing = await prisma.blogPost.findUnique({ where: { id: postId }, select: { blogId: true, status: true } })
  if (!existing) return apiError('Post not found', 404)
  if (existing.blogId !== userId) return apiError('Forbidden', 403)

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    title, content, excerpt, coverImage, status, visibility,
    tier, price, currency, tags,
  } = body as {
    title?: string; content?: string; excerpt?: string; coverImage?: string
    status?: string; visibility?: string; tier?: string
    price?: number; currency?: string; tags?: string[] | string
  }

  const isPublished = status === 'PUBLISHED'
  const goingLive = isPublished && existing.status !== 'PUBLISHED'

  const post = await prisma.blogPost.update({
    where: { id: postId },
    data: {
      title: title?.trim() || undefined,
      content: content?.trim() !== undefined ? content.trim() : undefined,
      excerpt: excerpt?.trim() !== undefined ? excerpt.trim() || null : undefined,
      coverImage: coverImage !== undefined ? coverImage || null : undefined,
      status: status ? (isPublished ? 'PUBLISHED' : 'DRAFT') : undefined,
      visibility: visibility || undefined,
      tier: tier !== undefined ? tier || null : undefined,
      price: typeof price === 'number' ? price : undefined,
      currency: currency || undefined,
      tags: Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === 'string' ? tags : undefined,
      publishedAt: goingLive ? new Date() : undefined,
    },
  })

  return apiSuccess(post)
}

// DELETE a post (owner only)
export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const existing = await prisma.blogPost.findUnique({ where: { id: postId }, select: { blogId: true, title: true } })
  if (!existing) return apiError('Post not found', 404)
  if (existing.blogId !== userId) return apiError('Forbidden', 403)

  await prisma.blogPost.delete({ where: { id: postId } })
  return apiSuccess({ success: true })
}