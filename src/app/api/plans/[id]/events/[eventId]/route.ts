import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const { eventId } = await params

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventJoiners: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  })

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  return NextResponse.json(event)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await params

  let body;
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!existingEvent) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const isOwner = existingEvent.organizerId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  let latitude = existingEvent.latitude
  let longitude = existingEvent.longitude

  const newLocation = body.location ?? existingEvent.location
  if (newLocation && newLocation !== existingEvent.location) {
    const geocodeResult = await geocodeLocation(newLocation)
    if (geocodeResult) {
      latitude = geocodeResult.latitude
      longitude = geocodeResult.longitude
    }
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      title: body.title ?? existingEvent.title,
      description: body.description ?? existingEvent.description,
      eventCategory: body.eventCategory ?? existingEvent.eventCategory,
      eventDate: body.eventDate ? new Date(body.eventDate) : existingEvent.eventDate,
      location: newLocation,
      locationDetails: body.locationDetails ?? existingEvent.locationDetails,
      latitude,
      longitude,
      maxJoiners: body.maxJoiners ?? existingEvent.maxJoiners
    }
  })

  return NextResponse.json(event)
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

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!existingEvent) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const isOwner = existingEvent.organizerId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await prisma.event.delete({
    where: { id: eventId }
  })

  return NextResponse.json({ success: true })
}