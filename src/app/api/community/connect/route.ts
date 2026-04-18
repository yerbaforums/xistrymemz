import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    const userId = session?.user?.id
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
    }

    const body = await request.json()
    const receiverId = body.receiverId
    const message = body.message

    if (!receiverId || typeof receiverId !== 'string') {
      return NextResponse.json({ error: 'Receiver ID required' }, { status: 400 })
    }

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

    return NextResponse.json({ connection, message: 'Connection request sent!' })
  } catch (error) {
    console.error('Error creating connection:', error)
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 })
  }
}
