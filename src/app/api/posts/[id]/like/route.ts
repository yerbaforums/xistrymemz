import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const userId = session.user.id
    const { id: postId } = await params

    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post) {
      return apiError("Post not found", 404)
    }

    const body = await request.json().catch(() => ({}))
    const liked = body.liked === true

    await prisma.$transaction(async (tx) => {
      if (liked) {
        await tx.postLike.upsert({
          where: { userId_postId: { userId, postId } },
          update: {},
          create: { userId, postId }
        })
        await tx.post.update({
          where: { id: postId },
          data: { likes: { increment: 1 } }
        })
      } else {
        await tx.postLike.deleteMany({ where: { userId, postId } })
        await tx.post.update({
          where: { id: postId },
          data: { likes: { decrement: 1 } }
        })
      }
    })

    const newPost = await prisma.post.findUnique({ where: { id: postId } })
    return NextResponse.json({ liked, likes: newPost?.likes ?? 0 })
  } catch (error) {
    console.error('Error toggling like:', error)
    return apiError("Failed to toggle like", 500)
  }
}
