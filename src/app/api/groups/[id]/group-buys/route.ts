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
        groupBuys: {
          include: {
            organizer: { select: { id: true, name: true, image: true } },
            _count: { select: { supporters: true } }
          },
          orderBy: { createdAt: 'desc' }
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

    return NextResponse.json(group.groupBuys)
  } catch (error) {
    console.error('GET /api/groups/[id]/group-buys:', error)
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
      return NextResponse.json({ error: 'Must be a member to create group buys' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, targetPrice, minSupporters, productUrl, productImage } = body

    if (!title || !targetPrice || targetPrice <= 0 || !minSupporters || minSupporters < 2) {
      return NextResponse.json({ error: 'Title, valid target price, and min 2 supporters required' }, { status: 400 })
    }

    const groupBuy = await prisma.groupBuy.create({
      data: {
        title,
        description,
        targetPrice,
        minSupporters,
        productUrl,
        productImage,
        organizerId: session.user.id,
        groupId: params.id
      },
      include: {
        organizer: { select: { id: true, name: true, image: true } },
        _count: { select: { supporters: true } }
      }
    })

    return NextResponse.json(groupBuy, { status: 201 })
  } catch (error) {
    console.error('POST /api/groups/[id]/group-buys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
