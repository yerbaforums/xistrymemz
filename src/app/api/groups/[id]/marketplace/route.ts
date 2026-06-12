import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const group = await prisma.group.findUnique({
      where: { id: params.id },
      include: {
        groupProducts: {
          include: {
            product: {
              include: {
                user: { select: { id: true, name: true, image: true } }
              }
            }
          },
          orderBy: { addedAt: 'desc' }
        }
      }
    })

    if (!group) {
      return apiError("Group not found", 404)
    }

    if (group.isPrivate) {
      const isMember = await prisma.groupMember.findFirst({
        where: { groupId: params.id, userId: userId || '' }
      })
      if (!isMember && !userId) {
        return apiError("Unauthorized", 403)
      }
    }

    const marketplaceProducts = group.groupProducts.map(gp => ({
      ...gp.product,
      user: gp.product.user
    }))

    return apiSuccess(marketplaceProducts)
  } catch (error) {
    console.error('GET /api/groups/[id]/marketplace:', error)
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

    const group = await prisma.group.findUnique({ where: { id: params.id } })
    if (!group) {
      return apiError("Group not found", 404)
    }

    const isMember = await prisma.groupMember.findFirst({
      where: { groupId: params.id, userId: session.user.id }
    })
    if (!isMember) {
      return apiError("Must be a member to link products", 403)
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return apiError("Product ID is required", 400)
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return apiError("Product not found", 404)
    }

    const existing = await prisma.groupProduct.findUnique({
      where: { groupId_productId: { groupId: params.id, productId } }
    })
    if (existing) {
      return apiError("Product already linked to this group", 400)
    }

    const groupProduct = await prisma.groupProduct.create({
      data: {
        groupId: params.id,
        productId,
        addedBy: session.user.id
      },
      include: {
        product: {
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        }
      }
    })

    return NextResponse.json({
      ...groupProduct.product,
      user: groupProduct.product.user
    }, { status: 201 })
  } catch (error) {
    console.error('POST /api/groups/[id]/marketplace:', error)
    return apiError("Internal server error", 500)
  }
}
