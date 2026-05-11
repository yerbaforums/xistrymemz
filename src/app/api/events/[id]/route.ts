import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true, image: true, role: true }
        },
        plan: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        school: { select: { id: true, schoolName: true, name: true } },
        shop: { select: { id: true, shopName: true, name: true } },
        _count: {
          select: { eventJoiners: true }
        },
        eventJoiners: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: { name: true, email: true, image: true, role: true, userClass: true }
            }
          },
          take: 50
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isOrganizer = session?.user?.id === event.organizerId
    const joined = session?.user?.id 
      ? event.eventJoiners.some(j => j.userId === session.user.id)
      : false

    const linkedTitle = event.plan?.title || event.group?.name || event.school?.schoolName || event.shop?.shopName || null

    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      eventCategory: event.eventCategory,
      eventDate: event.eventDate?.toISOString() || null,
      endDate: event.endDate?.toISOString() || null,
      location: event.location,
      locationDetails: event.locationDetails,
      latitude: event.latitude,
      longitude: event.longitude,
      maxJoiners: event.maxJoiners,
      pinned: event.pinned,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      acceptsDonations: event.acceptsDonations,
      donationAddress: event.donationAddress,
      donationCurrency: event.donationCurrency,
      needsVolunteers: event.needsVolunteers,
      volunteerRoles: event.volunteerRoles ? JSON.parse(event.volunteerRoles) : [],
      volunteerDescription: event.volunteerDescription,
      planId: event.planId,
      planTitle: linkedTitle,
      userId: event.organizerId,
      userName: event.organizer.name,
      organizer: event.organizer,
      group: event.group,
      joiners: event.eventJoiners.map(j => ({
        id: j.id,
        userId: j.userId,
        role: j.role,
        user: j.user
      })),
      joined,
      isOrganizer,
      _count: event._count
    })
  } catch (error) {
    console.error('GET /api/events/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (event.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

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
      acceptsDonations,
      donationAddress,
      donationCurrency,
      needsVolunteers,
      volunteerRoles,
      volunteerDescription
    } = body

    let latitude = event.latitude
    let longitude = event.longitude

    if (location && location !== event.location) {
      const geocodeResult = await geocodeLocation(location)
      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        eventCategory: eventCategory || event.eventCategory,
        eventDate: eventDate ? new Date(eventDate) : event.eventDate,
        endDate: endDate ? new Date(endDate) : event.endDate,
        location,
        locationDetails,
        latitude,
        longitude,
        maxJoiners: maxJoiners ?? event.maxJoiners,
        isTicketed: isTicketed ?? event.isTicketed,
        ticketPrice: ticketPrice ?? event.ticketPrice,
        currency: currency ?? event.currency,
        acceptsDonations: acceptsDonations ?? event.acceptsDonations,
        donationAddress: donationAddress ?? event.donationAddress,
        donationCurrency: donationCurrency ?? event.donationCurrency,
        needsVolunteers: needsVolunteers ?? event.needsVolunteers,
        volunteerRoles: volunteerRoles ? JSON.stringify(volunteerRoles) : event.volunteerRoles,
        volunteerDescription: volunteerDescription ?? event.volunteerDescription
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('PUT /api/events/[id]:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}