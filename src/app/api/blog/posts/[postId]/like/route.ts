import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST toggle like { liked: boolean } on a blog post
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string
  const { postId } = await params

  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { id: true } })
  if (!post) return apiError('Post not found', 404)

  const body = await request.json().catch(() => ({}) as { liked?: boolean })
  const liked = body.liked

  if (liked) {
    await prisma.blogPostLike.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId },
      update: {},
    })
    await prisma.blogPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
    })
  } else {
    const like = await prisma.blogPostLike.findUnique({ where: { postId_userId: { postId, userId } } })
    if (like) {
      await prisma.blogPostLike.delete({ where: { postId_userId: { postId, userId } } })
      await prisma.blogPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      })
    }
  }

  const post2 = await prisma.blogPost.findUnique({ where: { id: postId }, select: { likeCount: true } })
  return apiSuccess({ liked: !!liked, likeCount: post2?.likeCount ?? 0 })
}