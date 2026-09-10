import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiError('Unauthorized', 401)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const userId = body.userId as string | undefined
    if (!userId) return apiError('userId is required')

    const req = await prisma.request.findUnique({
      where: { id },
      select: { userId: true, assigneeId: true, projectId: true, title: true },
    })
    if (!req) return apiError('Request not found', 404)

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
      data: { assigneeId: userId },
    })

    await createNotification({
      type: 'SYSTEM',
      userId,
      actorId: session.user.id,
      entityId: id,
      entityType: 'REQUEST',
      message: `You have been assigned to the request: ${req.title}`,
      link: `/requests/${id}`,
    })

    return apiSuccess(updated)
  } catch (error) {
    return apiServerError(error)
  }
}
