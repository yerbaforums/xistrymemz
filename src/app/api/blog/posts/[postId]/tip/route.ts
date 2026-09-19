import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

const VALID_CURRENCIES = ['XMR', 'XTM', 'ZANO', 'FUSD', 'USD']

// POST tip a blog post { amount, currency }
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title: true, slug: true, blogId: true, blog: { select: { blogName: true, blogSlug: true } } },
  })
  if (!post) return apiError('Post not found', 404)

  const body = await request.json().catch(() => ({}) as { amount?: number; currency?: string })
  const amount = Number(body.amount)
  if (!amount || amount <= 0) return apiError('Enter a valid amount', 400)
  const currency = VALID_CURRENCIES.includes(body.currency || '') ? body.currency! : 'XTM'

  const tip = await prisma.blogPostTip.create({
    data: { postId, userId, amount, currency },
  })

  if (post.blogId !== userId) {
    try {
      await createNotification({
        type: 'SYSTEM',
        userId: post.blogId,
        message: `${session.user.name || 'Someone'} tipped ${amount} ${currency} on "${post.title}"`,
        link: `/blog/${post.blog.blogSlug || post.blogId}/${post.slug}`,
      } as never)
    } catch { /* non-fatal */ }
  }

  return apiSuccess(tip)
}