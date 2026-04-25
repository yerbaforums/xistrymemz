import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { eventId } = body

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.maxJoiners > 0) {
      const joinerCount = await prisma.eventJoiner.count({
        where: { eventId }
      })
      if (joinerCount >= event.maxJoiners) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 })
      }
    }

    const existingJoiner = await prisma.eventJoiner.findUnique({
      where: {
        eventId_userId: { eventId, userId: session.user.id }
      }
    })

    if (existingJoiner) {
      return NextResponse.json({ error: 'Already joined' }, { status: 400 })
    }

    const joiner = await prisma.eventJoiner.create({
      data: {
        eventId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, joiner })
  } catch (error) {
    console.error('Error joining event:', error)
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    }

    await prisma.eventJoiner.delete({
      where: {
        eventId_userId: { eventId, userId: session.user.id }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving event:', error)
    return NextResponse.json({ error: 'Failed to leave event' }, { status: 500 })
  }
}