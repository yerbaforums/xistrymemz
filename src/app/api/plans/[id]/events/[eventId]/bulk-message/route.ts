import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: planId, eventId } = await params
    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { userId: true }
    })

    if (!plan || plan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const event = await prisma.planEvent.findUnique({
      where: { id: eventId },
      include: {
        joiners: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const senderId = session.user.id

    const messagePromises = event.joiners.map((joiner) => {
      if (joiner.userId !== senderId) {
        return prisma.message.create({
          data: {
            senderId,
            receiverId: joiner.userId,
            content: `[Event: ${event.title}] ${message}`
          }
        })
      }
      return Promise.resolve(null)
    })

    await Promise.all(messagePromises)

    return NextResponse.json({ 
      success: true, 
      message: `Message sent to ${event.joiners.length - 1} attendee(s)`
    })
  } catch (error) {
    console.error('Bulk message error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
