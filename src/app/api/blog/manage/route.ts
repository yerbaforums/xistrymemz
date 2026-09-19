import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET owner dashboard data: blog info + all posts + subscribers + purchases + tips
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string

  const blog = await prisma.user.findUnique({
    where: { id: userId },
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
      showBlog: true,
    },
  })
  if (!blog?.blogSlug) return apiError('No blog yet — create one first', 404)

  const [posts, subscriptions, purchases, tips] = await Promise.all([
    prisma.blogPost.findMany({
      where: { blogId: userId },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: { _count: { select: { likes: true, purchases: true, tips: true } } },
    }),
    prisma.blogSubscription.findMany({
      where: { blogId: userId },
      include: { subscriber: { select: { id: true, name: true, image: true, username: true, email: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.blogPostPurchase.findMany({
      where: { post: { blogId: userId }, status: { in: ['PENDING', 'COMPLETED'] } },
      include: { user: { select: { id: true, name: true, image: true } }, post: { select: { id: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.blogPostTip.aggregate({
      where: { post: { blogId: userId } },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE')
  const earnings = {
    subscriptions: subscriptions
      .filter((s) => s.status === 'ACTIVE')
      .reduce((sum, s) => sum + s.price, 0),
    purchases: purchases
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0),
    tips: tips._sum.amount || 0,
    total: 0,
  }
  earnings.total = earnings.subscriptions + earnings.purchases + earnings.tips

  return apiSuccess({
    blog,
    posts,
    subscriptions,
    purchases,
    tipsCount: tips._count,
    activeSubscriberCount: activeSubs.length,
    earnings,
  })
}