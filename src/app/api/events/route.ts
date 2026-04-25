import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'public'

    if (type === 'personal') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const events = await prisma.userEvent.findMany({
        where: { userId: session.user.id },
        orderBy: { startDate: 'asc' }
      })
      return NextResponse.json(events)
    }

    const events = await prisma.groupEvent.findMany({
      include: {
        organizer: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { eventJoiners: true } }
      },
      orderBy: { eventDate: 'asc' }
    })

    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      eventCategory: event.eventCategory,
      eventDate: event.eventDate?.toISOString() || null,
      location: event.location,
      locationDetails: event.locationDetails,
      latitude: event.latitude,
      longitude: event.longitude,
      maxJoiners: event.maxJoiners,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      planId: null,
      planTitle: event.group?.name || null,
      userId: event.organizerId,
      userName: event.organizer?.name || null,
      joiners: [],
      _count: event._count
    }))

    return NextResponse.json(formattedEvents)
  } catch (error) {
    console.error('GET /api/events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      eventCategory, 
      eventDate, 
      endDate,
      location, 
      locationDetails, 
      maxJoiners,
      isTicketed,
      ticketPrice,
      currency,
      visibility,
      eventType
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    let latitude: number | null = null
    let longitude: number | null = null

    if (location) {
      const geocodeResult = await geocodeLocation(location)
      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
      }
    }

    if (eventType === 'personal') {
      const event = await prisma.userEvent.create({
        data: {
          title,
          description,
          startDate: eventDate ? new Date(eventDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          location,
          visibility: visibility || 'PRIVATE',
          userId: session.user.id
        }
      })
      return NextResponse.json(event)
    }

    const event = await prisma.groupEvent.create({
      data: {
        title,
        description,
        eventCategory: eventCategory || 'GENERAL',
        eventDate: eventDate ? new Date(eventDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location,
        locationDetails,
        latitude,
        longitude,
        maxJoiners: maxJoiners || 0,
        isTicketed: isTicketed || false,
        ticketPrice: ticketPrice || 0,
        currency: currency || 'USD',
        organizerId: session.user.id,
        shopId: eventCategory === 'SHOP' ? session.user.id : undefined
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('POST /api/events:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}