import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const myEvents = await prisma.userEvent.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' }
    })

    const publicEvents = await prisma.userEvent.findMany({
      where: { visibility: 'PUBLIC' },
      orderBy: { startDate: 'asc' }
    })

    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'CONNECTED' },
          { receiverId: userId, status: 'CONNECTED' }
        ]
      }
    })

    const connectionIds = connections
      .filter(c => c.requesterId === userId ? c.receiverId : c.requesterId)
      .map(c => c.requesterId === userId ? c.receiverId : c.requesterId)

    const connectionEvents = await prisma.userEvent.findMany({
      where: {
        visibility: 'CONNECTIONS',
        userId: { in: connectionIds }
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({
      myEvents,
      publicEvents,
      connectionEvents
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, startDate, endDate, allDay, location, color, visibility } = body

    if (!title || !startDate) {
      return NextResponse.json({ error: 'Title and start date are required' }, { status: 400 })
    }

    const event = await prisma.userEvent.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        allDay: allDay || false,
        location,
        color: color || '#3b82f6',
        visibility: visibility || 'PRIVATE',
        userId: session.user.id
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}