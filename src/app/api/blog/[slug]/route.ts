import { apiError, apiSuccess } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET public blog detail + published posts + subscription state for viewer
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const user = await prisma.user.findFirst({
    where: { blogSlug: slug, showBlog: true },
    select: {
      id: true,
      blogName: true,
      blogAbout: true,
      blogImage: true,
      blogCoverImage: true,
      blogCoverStyle: true,
      blogSlug: true,
      blogTagline: true,
      blogTiers: true,
      name: true,
      username: true,
      image: true,
      userClass: true,
      location: true,
      website: true,
      createdAt: true,
      role: true,
      userLinks: {
        select: { id: true, type: true, url: true, label: true, icon: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' },
      },
      donationAddresses: {
        where: { showQR: true },
        select: { id: true, currency: true, address: true, label: true, qrCodeUrl: true, showQR: true },
      },
      _count: { select: { blogPosts: { where: { status: 'PUBLISHED' } }, blogSubscriptions: { where: { status: 'ACTIVE' } } } },
    },
  })

  if (!user) {
    return apiError('Blog not found', 404)
  }

  const posts = await prisma.blogPost.findMany({
    where: { blogId: user.id, status: 'PUBLISHED' },
    orderBy: [{ publishedAt: 'desc' }],
    include: {
      _count: { select: { likes: true, purchases: true } },
    },
  })

  // Session-aware: subscription state, likes, and whether the viewer has access to paid posts
  const session = await getServerSession(authOptions)
  const viewerId = session?.user?.id as string | undefined
  const isOwner = !!viewerId && viewerId === user.id

  let subscription = null
  let purchasedIds = new Set<string>()
  let likedIds = new Set<string>()

  if (viewerId && !isOwner) {
    const [sub, purchases, likes] = await Promise.all([
      prisma.blogSubscription.findFirst({
        where: { blogId: user.id, subscriberId: viewerId, status: { in: ['ACTIVE', 'PENDING'] } },
      }),
      prisma.blogPostPurchase.findMany({
        where: { userId: viewerId, status: 'COMPLETED' },
        select: { postId: true },
      }),
      prisma.blogPostLike.findMany({
        where: { userId: viewerId },
        select: { postId: true },
      }),
    ])
    subscription = sub
    purchasedIds = new Set(purchases.map((p) => p.postId))
    likedIds = new Set(likes.map((l) => l.postId))
  } else if (viewerId) {
    const likes = await prisma.blogPostLike.findMany({
      where: { userId: viewerId },
      select: { postId: true },
    })
    likedIds = new Set(likes.map((l) => l.postId))
  }

  const hasSubscriptionAccess = !!subscription && subscription.status === 'ACTIVE'

  const postData = posts.map((p) => {
    const needsPayment = p.visibility !== 'FREE' && !isOwner && !purchasedIds.has(p.id) && !hasSubscriptionAccess
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      coverImage: p.coverImage,
      visibility: p.visibility,
      tier: p.tier,
      price: p.price,
      currency: p.currency,
      tags: p.tags,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      _count: p._count,
      locked: needsPayment,
      liked: likedIds.has(p.id),
      // Redact paid body in listings for non-owners without access
      content: needsPayment ? p.content.slice(0, 280) : p.content,
    }
  })

  // Email subscriber state (email-only follow from landing)
  const emailSubscriber =
    viewerId && typeof session?.user?.email === 'string'
      ? await prisma.emailSubscriber.findUnique({ where: { email: session.user.email } }).catch(() => null)
      : null

  return apiSuccess({
    blog: {
      id: user.id,
      blogName: user.blogName,
      blogAbout: user.blogAbout,
      blogImage: user.blogImage,
      blogCoverImage: user.blogCoverImage,
      blogCoverStyle: user.blogCoverStyle,
      blogSlug: user.blogSlug,
      blogTagline: user.blogTagline,
      blogTiers: user.blogTiers,
      name: user.name,
      username: user.username,
      image: user.image,
      userClass: user.userClass,
      location: user.location,
      website: user.website,
      createdAt: user.createdAt,
      role: user.role,
      userLinks: user.userLinks,
      donationAddresses: user.donationAddresses,
      postCount: user._count.blogPosts,
      subscriberCount: user._count.blogSubscriptions,
      isOwner,
    },
    posts: postData,
    subscription,
    emailSubscribed: !!emailSubscriber,
  })
}