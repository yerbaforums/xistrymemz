import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized - Please log in' }, { status: 401 })
  }

  const { eventId } = await params
  
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const existingJoiner = await prisma.eventJoiner.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id }
    }
  })

  if (existingJoiner) {
    return NextResponse.json({ error: 'Already joined' }, { status: 400 })
  }

  if (event.maxJoiners > 0) {
    const joinerCount = await prisma.eventJoiner.count({
      where: { eventId }
    })
    if (joinerCount >= event.maxJoiners) {
      return NextResponse.json({ error: 'Event is full' }, { status: 400 })
    }
  }

  try {
    const joiner = await prisma.eventJoiner.create({
      data: {
        eventId,
        userId: session.user.id
      }
    })

    return NextResponse.json(joiner)
  } catch (error: unknown) {
    console.error('Error joining event:', error)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Already joined this event' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to join event' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await params

  const existingJoiner = await prisma.eventJoiner.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id }
    }
  })

  if (!existingJoiner) {
    return NextResponse.json({ error: 'Not joined' }, { status: 400 })
  }

  await prisma.eventJoiner.delete({
    where: { id: existingJoiner.id }
  })

  return NextResponse.json({ success: true })
}