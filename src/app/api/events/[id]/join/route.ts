import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.groupEvent.findUnique({
      where: { id },
      select: { 
        id: true, 
        maxJoiners: true,
        eventDate: true,
        _count: { select: { eventJoiners: true } }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.eventDate && new Date(event.eventDate) < new Date()) {
      return NextResponse.json({ error: 'Event has already occurred' }, { status: 400 })
    }

    if (event.maxJoiners > 0 && event._count.eventJoiners >= event.maxJoiners) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }

    const existing = await prisma.groupEventJoiner.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Already joined' }, { status: 400 })
    }

    await prisma.groupEventJoiner.create({
      data: {
        eventId: id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST /api/events/[id]/join:', error)
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.groupEventJoiner.deleteMany({
      where: {
        eventId: id,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/events/[id]/join:', error)
    return NextResponse.json({ error: 'Failed to leave event' }, { status: 500 })
  }
}