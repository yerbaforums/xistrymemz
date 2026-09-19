import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ replyId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { replyId } = await params
  const body = await request.json()
  const { content, side } = body

  const existingReply = await prisma.forumReply.findUnique({
    where: { id: replyId }
  })

  if (!existingReply) {
    return apiError("Reply not found", 404)
  }

  // Check if user is author or admin
  const isAuthor = existingReply.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return apiError("Forbidden", 403)
  }

  if (content !== undefined && !content.trim()) {
    return apiError("Content is required", 400)
  }

  const updated = await prisma.forumReply.update({
    where: { id: replyId },
    data: {
      ...(content !== undefined && content !== null && { content }),
      ...(side !== undefined && { side })
    }
  })

  return apiSuccess(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ replyId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { replyId } = await params

  const existingReply = await prisma.forumReply.findUnique({
    where: { id: replyId }
  })

  if (!existingReply) {
    return apiError("Reply not found", 404)
  }

  // Check if user is author or admin
  const isAuthor = existingReply.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return apiError("Forbidden", 403)
  }

  // Delete tips first
  await prisma.forumReplyTip.deleteMany({
    where: { replyId }
  })

  // Delete reply
  await prisma.forumReply.delete({
    where: { id: replyId }
  })

  // Decrement reply count on post
  await prisma.forumPost.update({
    where: { id: existingReply.postId },
    data: { replyCount: { decrement: 1 } }
  })

  return apiSuccess({ success: true })
}
