import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { entityType, entityId, message, intent } = await request.json()
    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Missing entityType or entityId' }, { status: 400 })
    }

    const validTypes = ['PRODUCT', 'EVENT', 'GROUP', 'PLAN']
    if (!validTypes.includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    let receiverId: string | null = null
    if (entityType === 'PRODUCT') {
      const product = await prisma.product.findUnique({ where: { id: entityId }, select: { userId: true } })
      receiverId = product?.userId || null
    } else if (entityType === 'EVENT') {
      const event = await prisma.event.findUnique({ where: { id: entityId }, select: { organizerId: true } })
      receiverId = event?.organizerId || null
    } else if (entityType === 'GROUP') {
      const group = await prisma.group.findUnique({ where: { id: entityId }, select: { userId: true } })
      receiverId = group?.userId || null
    } else if (entityType === 'PLAN') {
      const plan = await prisma.plan.findUnique({ where: { id: entityId }, select: { userId: true } })
      receiverId = plan?.userId || null
    }

    if (!receiverId) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }
    if (receiverId === session.user.id) {
      return NextResponse.json({ error: 'Cannot send request to yourself' }, { status: 400 })
    }

    const existing = await prisma.collaborationRequest.findFirst({
      where: { senderId: session.user.id, receiverId, entityType, entityId, status: 'PENDING' },
    })
    if (existing) {
      return NextResponse.json({ error: 'Request already sent' }, { status: 409 })
    }

    const collab = await prisma.collaborationRequest.create({
      data: {
        senderId: session.user.id,
        receiverId,
        entityType,
        entityId,
        message: message || null,
        intent: intent || 'COLLABORATE',
      },
    })

    return NextResponse.json(collab, { status: 201 })
  } catch (error) {
    console.error('POST /api/collab-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sent = await prisma.collaborationRequest.findMany({
      where: { senderId: session.user.id },
      include: {
        receiver: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const received = await prisma.collaborationRequest.findMany({
      where: { receiverId: session.user.id },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ sent, received })
  } catch (error) {
    console.error('GET /api/collab-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, status } = await request.json()
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Status must be ACCEPTED or DECLINED' }, { status: 400 })
    }

    const collab = await prisma.collaborationRequest.findUnique({ where: { id } })
    if (!collab || collab.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }

    const updated = await prisma.collaborationRequest.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/collab-requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
