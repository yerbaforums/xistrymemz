import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('Unauthorized', 401)

    const { id } = await params

    const req = await prisma.request.findUnique({
      where: { id },
      select: { userId: true, assigneeId: true, projectId: true, status: true, title: true },
    })
    if (!req) return apiError('Request not found', 404)

    if (!['PENDING', 'APPROVED'].includes(req.status)) {
      return apiError('Request must be PENDING or APPROVED to start')
    }

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = req.userId === session.user.id
    const isAssignee = req.assigneeId === session.user.id

    let isProjectOwner = false
    if (req.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: req.projectId },
        select: { userId: true },
      })
      isProjectOwner = project?.userId === session.user.id
    }

    if (!isOwner && !isAssignee && !isProjectOwner && !isAdmin) {
      return apiError('Unauthorized', 403)
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
    })

    await prisma.requestStatusHistory.create({
      data: {
        requestId: id,
        fromStatus: req.status,
        toStatus: 'IN_PROGRESS',
        changedById: session.user.id,
        reason: 'Marked as in progress',
      },
    })

    await createNotification({
      type: 'SYSTEM',
      userId: req.userId,
      actorId: session.user.id,
      entityId: id,
      entityType: 'REQUEST',
      message: `Your request "${req.title}" has been moved to In Progress`,
      link: `/requests/${id}`,
    })

    return apiSuccess(updated)
  } catch (error) {
    return apiServerError(error)
  }
}
