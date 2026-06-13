import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
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
    return apiError("Event not found", 404)
  }

  return apiSuccess(event)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { eventId } = await params

  let body;
  try {
    body = await request.json()
  } catch {
    return apiError("Invalid JSON body", 400)
  }

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!existingEvent) {
    return apiError("Event not found", 404)
  }

  const isOwner = existingEvent.organizerId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return apiError("Not authorized", 403)
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
      endDate: body.endDate ? new Date(body.endDate) : existingEvent.endDate,
      location: newLocation,
      locationDetails: body.locationDetails ?? existingEvent.locationDetails,
      latitude,
      longitude,
      maxJoiners: body.maxJoiners ?? existingEvent.maxJoiners,
      isTicketed: body.isTicketed !== undefined ? body.isTicketed : existingEvent.isTicketed,
      ticketPrice: body.ticketPrice !== undefined ? body.ticketPrice : existingEvent.ticketPrice,
      currency: body.currency ?? existingEvent.currency
    }
  })

  return apiSuccess(event)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { eventId } = await params

  const existingEvent = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!existingEvent) {
    return apiError("Event not found", 404)
  }

  const isOwner = existingEvent.organizerId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return apiError("Not authorized", 403)
  }

  await prisma.event.delete({
    where: { id: eventId }
  })

  return apiSuccess({ success: true })
}