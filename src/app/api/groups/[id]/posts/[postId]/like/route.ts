import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id: groupId, postId } = await params
    const { liked } = await request.json()

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } }
    })
    if (!member) {
      return apiError("Must be a member", 403)
    }

    const post = await prisma.groupPost.findUnique({ where: { id: postId } })
    if (!post || post.groupId !== groupId) {
      return apiError("Post not found", 404)
    }

    const updated = await prisma.groupPost.update({
      where: { id: postId },
      data: { likes: liked ? post.likes + 1 : Math.max(0, post.likes - 1) }
    })

    return apiSuccess({ likes: updated.likes })
  } catch (error) {
    console.error('Error toggling like:', error)
    return apiError("Failed to toggle like", 500)
  }
}
