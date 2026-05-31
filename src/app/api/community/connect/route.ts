import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { connectionSchema, validateBody } from '@/lib/schemas'
import { sseManager } from '@/lib/sse'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const userId = session?.user?.id
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateBody(connectionSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { receiverId, message } = validation.data

    if (receiverId === userId) {
      return NextResponse.json({ error: 'Cannot connect with yourself' }, { status: 400 })
    }

    const receiverExists = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true }
    })

    if (!receiverExists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId },
          { requesterId: receiverId, receiverId: userId }
        ]
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 400 })
    }

    const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    const connection = await prisma.connection.create({
      data: {
        requesterId: userId,
        receiverId,
        status: 'PENDING'
      }
    })

    if (message && message.trim()) {
      await prisma.message.create({
        data: {
          senderId: userId,
          receiverId,
          content: message.trim(),
          read: false
        }
      })
    }

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        message: `${requester?.name || 'Someone'} wants to connect with you`,
        link: `/connections`,
        relatedId: connection.id,
      }
    })
    sseManager.emit(receiverId, JSON.stringify({ type: 'notification' }))

    return NextResponse.json({ connection, message: 'Connection request sent!' })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const userId = session?.user?.id
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get('connectionId')

    if (!connectionId) {
      return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 })
    }

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.requesterId !== userId && connection.receiverId !== userId) {
      return NextResponse.json({ error: 'Not authorized to disconnect' }, { status: 403 })
    }

    await prisma.connection.delete({
      where: { id: connectionId }
    })

    return NextResponse.json({ message: 'Disconnected successfully' })
  } catch (error) {
    console.error('Error disconnecting:', error)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const userId = session?.user?.id
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const body = await request.json()
    const { connectionId, action } = body

    if (!connectionId || !action) {
      return NextResponse.json({ error: 'Connection ID and action are required' }, { status: 400 })
    }

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Action must be ACCEPT or REJECT' }, { status: 400 })
    }

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.receiverId !== userId) {
      return NextResponse.json({ error: 'Only the receiver can accept or reject' }, { status: 403 })
    }

    if (action === 'REJECT') {
      await prisma.connection.delete({
        where: { id: connectionId }
      })
      return NextResponse.json({ message: 'Connection request rejected' })
    }

    const receiver = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: { status: 'ACCEPTED' },
      include: {
        requester: { select: { id: true, name: true, image: true, username: true } },
        receiver: { select: { id: true, name: true, image: true, username: true } }
      }
    })

    if (connection.requesterId) {
      await prisma.notification.create({
        data: {
          userId: connection.requesterId,
          type: 'CONNECTION_ACCEPTED',
          title: 'Connection Accepted',
          message: `${receiver?.name || 'Someone'} accepted your connection request`,
          link: `/connections`,
          relatedId: connection.id,
        }
      })
      sseManager.emit(connection.requesterId, JSON.stringify({ type: 'notification' }))
    }

    return NextResponse.json({ connection: updated, message: 'Connection accepted!' })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}
