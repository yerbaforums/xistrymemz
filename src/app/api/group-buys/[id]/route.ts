import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    const groupBuy = await prisma.groupBuy.findUnique({
      where: { id: params.id },
      include: {
        organizer: { select: { id: true, name: true, image: true } },
        group: { select: { id: true, name: true } },
        supporters: {
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: { joinedAt: 'asc' }
        },
        _count: { select: { supporters: true } }
      }
    })

    if (!groupBuy) {
      return apiError("Group buy not found", 404)
    }

    return apiSuccess(groupBuy)
  } catch (error) {
    console.error('GET /api/group-buys/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const groupBuy = await prisma.groupBuy.findUnique({ where: { id: params.id } })
    if (!groupBuy) {
      return apiError("Group buy not found", 404)
    }

    if (groupBuy.organizerId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    const body = await request.json()
    const { title, description, targetPrice, minSupporters, productUrl, productImage, status } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (targetPrice !== undefined) updateData.targetPrice = targetPrice
    if (minSupporters !== undefined) updateData.minSupporters = minSupporters
    if (productUrl !== undefined) updateData.productUrl = productUrl
    if (productImage !== undefined) updateData.productImage = productImage
    if (status !== undefined) {
      updateData.status = status
      if (status === 'COMPLETED') updateData.completedAt = new Date()
    }

    const updated = await prisma.groupBuy.update({
      where: { id: params.id },
      data: updateData,
      include: {
        organizer: { select: { id: true, name: true, image: true } },
        _count: { select: { supporters: true } }
      }
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('PUT /api/group-buys/[id]:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const groupBuy = await prisma.groupBuy.findUnique({ where: { id: params.id } })
    if (!groupBuy) {
      return apiError("Group buy not found", 404)
    }

    if (groupBuy.organizerId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    await prisma.groupBuy.delete({ where: { id: params.id } })
    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/group-buys/[id]:', error)
    return apiError("Internal server error", 500)
  }
}
