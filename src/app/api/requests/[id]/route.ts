import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

async function canAccessRequest(userId: string, roleId: string, requestId: string) {
  const req = await prisma.request.findFirst({
    where: { id: requestId },
    select: { userId: true, projectId: true, isPublic: true }
  })
  if (!req) return null
  const isOwner = req.userId === userId
  const isAdmin = roleId === 'ADMIN'
  let isPlanOwner = false
  let isPlanEditor = false
  if (req.projectId) {
    const project = await prisma.project.findFirst({ where: { id: req.projectId }, select: { userId: true } })
    if (project) {
      isPlanOwner = project.userId === userId
      isPlanEditor = await prisma.projectEditor.findFirst({ where: { projectId: req.projectId, userId } }).then(Boolean)
    }
  }
  const hasAccess = isOwner || isPlanOwner || isPlanEditor || isAdmin || req.isPublic
  return { req, isOwner, isPlanOwner, isPlanEditor, isAdmin, hasAccess }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const access = await canAccessRequest(session.user.id, (session.user as { role?: string }).role || 'USER', id)
    if (!access || !access.hasAccess) {
      return apiError("Request not found", 404)
    }

    const req = await prisma.request.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            user: { select: { id: true, name: true, username: true, shopSlug: true } }
          }
        },
        user: {
          select: {
            id: true, name: true, username: true, image: true, shopSlug: true,
            donationAddresses: {
              where: { isPublic: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        product: { select: { id: true, title: true, price: true, imageUrl: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, username: true, image: true, shopSlug: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: { select: { fulfillments: true } }
      }
    })

    if (!req) {
      return apiError("Request not found", 404)
    }

    return apiSuccess(req)
  } catch (error) {
    console.error('GET /api/requests/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const access = await canAccessRequest(session.user.id, (session.user as { role?: string }).role || 'USER', id)
    if (!access || !(access.isOwner || access.isPlanOwner || access.isPlanEditor || access.isAdmin)) {
      return apiError("Request not found or unauthorized", 404)
    }

    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const body: any = parsedBody
    const existingRequest = await prisma.request.findUnique({ where: { id } })
    if (!existingRequest) {
      return apiError("Request not found", 404)
    }

    const newStatus = body.status ?? existingRequest.status

    const req = await prisma.request.update({
      where: { id },
      data: {
        title: body.title ?? existingRequest.title,
        description: body.description ?? existingRequest.description,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : existingRequest.imageUrl,
        status: newStatus,
        category: body.category ?? existingRequest.category,
        priority: body.priority ?? existingRequest.priority,
        budget: body.budget !== undefined ? body.budget : existingRequest.budget,
        goalAmount: body.goalAmount !== undefined ? body.goalAmount : existingRequest.goalAmount,
        currentFunding: body.currentFunding !== undefined ? body.currentFunding : existingRequest.currentFunding,
        payoutAddress: body.payoutAddress !== undefined ? body.payoutAddress : existingRequest.payoutAddress,
        payoutCurrency: body.payoutCurrency !== undefined ? body.payoutCurrency : existingRequest.payoutCurrency,
        location: body.location !== undefined ? body.location : existingRequest.location,
        deadline: body.deadline ? new Date(body.deadline) : existingRequest.deadline,
        isPublic: body.isPublic !== undefined ? body.isPublic : existingRequest.isPublic,
        allowFulfillments: body.allowFulfillments !== undefined ? body.allowFulfillments : existingRequest.allowFulfillments,
        showDonationAddress: body.showDonationAddress !== undefined ? body.showDonationAddress : existingRequest.showDonationAddress
      }
    })

    if (newStatus !== existingRequest.status) {
      await prisma.requestStatusHistory.create({
        data: {
          requestId: id,
          fromStatus: existingRequest.status,
          toStatus: newStatus,
          changedById: session.user.id,
          reason: body.statusReason || 'Status updated'
        }
      })
    }

    if (body.hashtags !== undefined && Array.isArray(body.hashtags)) {
      await linkHashtags('REQUEST', id, body.hashtags)
    } else {
      const title = body.title ?? existingRequest.title
      const description = body.description ?? existingRequest.description
      await extractAndLinkHashtags(title + ' ' + (description || ''), 'REQUEST', id)
    }

    return apiSuccess(req)
  } catch (error) {
    console.error('PUT /api/requests/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const access = await canAccessRequest(session.user.id, (session.user as { role?: string }).role || 'USER', id)
    if (!access || !(access.isOwner || access.isPlanOwner || access.isPlanEditor || access.isAdmin)) {
      return apiError("Request not found or unauthorized", 404)
    }

    await prisma.request.delete({ where: { id } })
    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/requests/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const access = await canAccessRequest(session.user.id, (session.user as { role?: string }).role || 'USER', id)
    if (!access || !(access.isOwner || access.isPlanOwner || access.isPlanEditor || access.isAdmin)) {
      return apiError("Request not found or unauthorized", 404)
    }

    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const body: any = parsedBody
    const existingRequest = await prisma.request.findUnique({ where: { id } })
    if (!existingRequest) {
      return apiError("Request not found", 404)
    }

    const req = await prisma.request.update({
      where: { id },
      data: {
        goalAmount: body.goalAmount !== undefined ? body.goalAmount : existingRequest.goalAmount,
        payoutAddress: body.payoutAddress !== undefined ? body.payoutAddress : existingRequest.payoutAddress,
        payoutCurrency: body.payoutCurrency !== undefined ? body.payoutCurrency : existingRequest.payoutCurrency,
        allowFulfillments: body.allowFulfillments !== undefined ? body.allowFulfillments : existingRequest.allowFulfillments
      }
    })

    return apiSuccess(req)
  } catch (error) {
    console.error('PATCH /api/requests/[id]:', error)
    return apiError("Internal server error", 500)
  }
}
