import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id: groupId, postId } = await params

    const post = await prisma.groupPost.findUnique({ where: { id: postId } })
    if (!post || post.groupId !== groupId) {
      return apiError("Post not found", 404)
    }

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } }
    })
    if (!member || (post.userId !== session.user.id && member.role !== 'ADMIN')) {
      return apiError("Not authorized", 403)
    }

    await prisma.groupPost.delete({ where: { id: postId } })
    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error deleting group post:', error)
    return apiError("Failed to delete post", 500)
  }
}
