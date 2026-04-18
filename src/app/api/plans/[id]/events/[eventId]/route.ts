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

  const event = await prisma.planEvent.findUnique({
    where: { id: eventId },
    include: {
      joiners: {
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
  const body = await request.json()

  const existingEvent = await prisma.planEvent.findUnique({
    where: { id: eventId },
    include: { plan: true }
  })

  if (!existingEvent || existingEvent.plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
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

  const event = await prisma.planEvent.update({
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

  const existingEvent = await prisma.planEvent.findUnique({
    where: { id: eventId },
    include: { plan: true }
  })

  if (!existingEvent || existingEvent.plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  await prisma.planEvent.delete({
    where: { id: eventId }
  })

  return NextResponse.json({ success: true })
}
