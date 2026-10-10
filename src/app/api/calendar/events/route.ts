import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
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

    // Joined marketplace events (RSVP'd) — previously invisible in planner.
    const joinedJoins = await prisma.eventJoiner.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true, title: true, description: true, eventDate: true,
            endDate: true, location: true,
          },
        },
      },
    })
    const joinedEvents = joinedJoins
      .map(j => j.event)
      .filter(e => e && e.eventDate)

    // Own requests carrying a deadline.
    const requestDeadlines = await prisma.request.findMany({
      where: { userId, deadline: { not: null } },
      select: { id: true, title: true, deadline: true },
      orderBy: { deadline: 'asc' },
    })

    // Rental windows where the user is renter or owner (handover/return).
    const rentalWindows = await prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        rentalStart: { not: null },
        status: { notIn: ['CANCELLED', 'DELIVERED'] },
      },
      select: {
        id: true, description: true, rentalStart: true, rentalEnd: true,
        status: true, buyerId: true,
      },
      orderBy: { rentalStart: 'asc' },
    })

    return NextResponse.json({
      myEvents,
      publicEvents,
      connectionEvents,
      joinedEvents,
      requestDeadlines,
      rentalWindows,
    })
  } catch (error) {
    console.error('Error fetching calendar events:', error)
    return apiError("Failed to fetch events", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { title, description, startDate, endDate, allDay, location, color, visibility } = body

    if (!title || !startDate) {
      return apiError("Title and start date are required", 400)
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

    return apiSuccess(event)
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return apiError("Failed to create event", 500)
  }
}