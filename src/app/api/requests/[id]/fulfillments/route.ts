import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const req = await prisma.request.findFirst({
      where: { id },
      select: {
        userId: true,
        planId: true,
        allowFulfillments: true
      }
    })

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    const fulfillments = await prisma.requestFulfillment.findMany({
      where: { requestId: id },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ fulfillments, allowFulfillments: req.allowFulfillments })
  } catch (error) {
    console.error('GET /api/requests/[id]/fulfillments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const req = await prisma.request.findFirst({
      where: { id },
      select: { userId: true, allowFulfillments: true, title: true }
    })

    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (!req.allowFulfillments) {
      return NextResponse.json({ error: 'Fulfillments are disabled for this request' }, { status: 400 })
    }

    if (req.userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot fulfill your own request' }, { status: 400 })
    }

    if (!body.title?.trim() || !body.content?.trim()) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const existing = await prisma.requestFulfillment.findFirst({
      where: { requestId: id, userId: session.user.id, status: 'PENDING' }
    })

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending offer for this request' }, { status: 400 })
    }

    const fulfillment = await prisma.requestFulfillment.create({
      data: {
        requestId: id,
        userId: session.user.id,
        title: body.title.trim(),
        content: body.content.trim()
      },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      }
    })

    return NextResponse.json(fulfillment)
  } catch (error) {
    console.error('POST /api/requests/[id]/fulfillments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
