import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id, fid } = await params
    const body = await request.json()
    const { action } = body

    if (!['APPROVED', 'DECLINED'].includes(action)) {
      return apiError("Action must be APPROVED or DECLINED", 400)
    }

    const fulfillment = await prisma.requestFulfillment.findFirst({
      where: { id: fid, requestId: id },
      include: { request: true }
    })

    if (!fulfillment) {
      return apiError("Fulfillment not found", 404)
    }

    if (fulfillment.status !== 'PENDING') {
      return apiError("Fulfillment already processed", 400)
    }

    const req = fulfillment.request
    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'

    const isRequestOwner = req.userId === session.user.id
    let isPlanOwner = false
    let isPlanEditor = false

    if (req.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: req.projectId },
        select: { userId: true }
      })
      if (project) {
        isPlanOwner = project.userId === session.user.id
        isPlanEditor = await prisma.projectEditor.findFirst({
          where: { projectId: req.projectId, userId: session.user.id }
        }).then(Boolean)
      }
    }

    if (!isRequestOwner && !isPlanOwner && !isPlanEditor && !isAdmin) {
      return apiError("Unauthorized", 403)
    }

    const updated = await prisma.requestFulfillment.update({
      where: { id: fid },
      data: { status: action },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      }
    })

    if (action === 'APPROVED' && body.autoComplete) {
      await prisma.request.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedBy: fulfillment.userId,
          completedAt: new Date()
        }
      })

      await prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: req.status,
          toStatus: 'COMPLETED',
          changedById: session.user.id,
          reason: 'Fulfillment approved and request completed'
        }
      })
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('POST /api/requests/[id]/fulfillments/[fid]/respond:', error)
    return apiError("Internal server error", 500)
  }
}
