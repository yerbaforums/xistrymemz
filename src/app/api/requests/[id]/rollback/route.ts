import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const body = await request.json()
  const { toStatus, reason } = body

  if (!toStatus) {
    return apiError("toStatus is required", 400)
  }

  const existingRequest = await prisma.request.findUnique({
    where: { id },
    select: { 
      userId: true, 
      planId: true, 
      status: true,
      plan: { select: { userId: true } }
    }
  })

  if (!existingRequest) {
    return apiError("Request not found", 404)
  }

  // Check permissions: owner, plan owner, or admin
  const isOwner = existingRequest.userId === session.user.id
  const isPlanOwner = existingRequest.plan?.userId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isPlanOwner && !isAdmin) {
    return apiError("Forbidden", 403)
  }

  const updatedRequest = await prisma.request.update({
    where: { id },
    data: { 
      status: toStatus,
      completedBy: toStatus === 'COMPLETED' ? null : existingRequest.userId,
      completedAt: toStatus === 'COMPLETED' ? new Date() : null
    }
  })

  // Create status history entry (not just a comment)
  await prisma.requestStatusHistory.create({
    data: {
      requestId: id,
      fromStatus: existingRequest.status,
      toStatus,
      changedById: session.user.id,
      reason: reason || 'Status rolled back'
    }
  })

  await prisma.comment.create({
    data: {
      content: `Status rolled back from ${existingRequest.status} to ${toStatus}. ${reason || ''}`.trim(),
      userId: session.user.id,
      requestId: id
    }
  })

  return apiSuccess(updatedRequest)
}
