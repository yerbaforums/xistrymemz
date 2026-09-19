import { apiError, apiSuccess } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET a single published post by (blogSlug, postSlug) — SEO-friendly lookup
// Mirrors the paywall logic of /api/blog/posts/[postId]
export async function GET(request: Request, { params }: { params: Promise<{ postSlug: string }> }) {
  const { postSlug } = await params
  const { searchParams } = new URL(request.url)
  const blogSlug = searchParams.get('blogSlug')

  if (!blogSlug) return apiError('blogSlug is required', 400)

  const blog = await prisma.user.findFirst({
    where: { blogSlug, showBlog: true },
    select: { id: true },
  })
  if (!blog) return apiError('Blog not found', 404)

  const post = await prisma.blogPost.findFirst({
    where: { blogId: blog.id, slug: postSlug },
    include: {
      blog: {
        select: {
          id: true, blogName: true, blogSlug: true, blogImage: true, blogTagline: true,
          name: true, image: true, username: true,
        },
      },
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
        where: { postId: post.id, userId: viewerId, status: 'COMPLETED' },
      }),
    ])
    if (sub) {
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
      where: { postId_userId: { postId: post.id, userId: viewerId } },
      select: { id: true },
    })
    liked = !!like
  }

  // Record view
  if (!isOwner && post.status === 'PUBLISHED') {
    await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
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