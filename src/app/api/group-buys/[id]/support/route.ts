import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params

    const groupBuy = await prisma.groupBuy.findUnique({
      where: { id: params.id }
    })
    if (!groupBuy) {
      return apiError("Group buy not found", 404)
    }

    const supporters = await prisma.groupBuySupporter.findMany({
      where: { groupBuyId: params.id },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } }
      },
      orderBy: { joinedAt: 'asc' }
    })

    return apiSuccess({ supporters })
  } catch (error) {
    console.error('GET /api/group-buys/[id]/support:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const groupBuy = await prisma.groupBuy.findUnique({
      where: { id: params.id },
      include: { group: true }
    })
    if (!groupBuy) {
      return apiError("Group buy not found", 404)
    }

    if (groupBuy.status !== 'ACTIVE') {
      return apiError("Group buy is no longer active", 400)
    }

    const existing = await prisma.groupBuySupporter.findUnique({
      where: { groupBuyId_userId: { groupBuyId: params.id, userId: session.user.id } }
    })
    if (existing) {
      return apiError("Already supporting this group buy", 400)
    }

    const body = await request.json()
    const amount = body?.amount || 1

    const supporter = await prisma.groupBuySupporter.create({
      data: {
        groupBuyId: params.id,
        userId: session.user.id,
        amount
      }
    })

    const totalSupporters = await prisma.groupBuySupporter.count({ where: { groupBuyId: params.id } })
    const totalAmount = await prisma.groupBuySupporter.aggregate({
      where: { groupBuyId: params.id },
      _sum: { amount: true }
    })

    const updates: Record<string, unknown> = {
      currentSupporters: totalSupporters,
      currentPrice: totalAmount._sum.amount || 0
    }

    if (totalSupporters >= groupBuy.minSupporters && (totalAmount._sum.amount || 0) >= groupBuy.targetPrice) {
      updates.status = 'COMPLETED'
      updates.completedAt = new Date()
    }

    await prisma.groupBuy.update({
      where: { id: params.id },
      data: updates
    })

    return NextResponse.json(supporter, { status: 201 })
  } catch (error) {
    console.error('POST /api/group-buys/[id]/support:', error)
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

    const existing = await prisma.groupBuySupporter.findUnique({
      where: { groupBuyId_userId: { groupBuyId: params.id, userId: session.user.id } }
    })
    if (!existing) {
      return apiError("Not supporting this group buy", 404)
    }

    await prisma.groupBuySupporter.delete({
      where: { groupBuyId_userId: { groupBuyId: params.id, userId: session.user.id } }
    })

    const totalSupporters = await prisma.groupBuySupporter.count({ where: { groupBuyId: params.id } })
    const totalAmount = await prisma.groupBuySupporter.aggregate({
      where: { groupBuyId: params.id },
      _sum: { amount: true }
    })

    await prisma.groupBuy.update({
      where: { id: params.id },
      data: {
        currentSupporters: totalSupporters,
        currentPrice: totalAmount._sum.amount || 0,
        status: totalSupporters > 0 ? 'ACTIVE' : 'ACTIVE',
        completedAt: null
      }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/group-buys/[id]/support:', error)
    return apiError("Internal server error", 500)
  }
}
