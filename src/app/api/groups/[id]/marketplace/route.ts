import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.isPrivate) {
      const isMember = await prisma.groupMember.findFirst({
        where: { groupId: params.id, userId: userId || '' }
      })
      if (!isMember && !userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    const marketplaceProducts = group.groupProducts.map(gp => ({
      ...gp.product,
      user: gp.product.user
    }))

    return NextResponse.json(marketplaceProducts)
  } catch (error) {
    console.error('GET /api/groups/[id]/marketplace:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const params = await ctx.params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const group = await prisma.group.findUnique({ where: { id: params.id } })
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const isMember = await prisma.groupMember.findFirst({
      where: { groupId: params.id, userId: session.user.id }
    })
    if (!isMember) {
      return NextResponse.json({ error: 'Must be a member to link products' }, { status: 403 })
    }

    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const existing = await prisma.groupProduct.findUnique({
      where: { groupId_productId: { groupId: params.id, productId } }
    })
    if (existing) {
      return NextResponse.json({ error: 'Product already linked to this group' }, { status: 400 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
