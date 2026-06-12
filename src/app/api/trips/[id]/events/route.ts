import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: tripId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return apiError("Not found or no edit permission", 404)
  }

  const body = await request.json()
  const { title, description, eventDate, endDate, location, latitude, longitude, stopId } = body

  if (!title?.trim()) {
    return apiError("Title is required", 400)
  }

  const event_record = await prisma.event.create({
    data: {
      title: title.trim(),
      description: description || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      location: location || null,
      latitude: latitude || null,
      longitude: longitude || null,
      organizerId: session.user.id,
    }
  })

  if (stopId) {
    const stop = await prisma.tripStop.findFirst({ where: { id: stopId, tripId } })
    if (stop) {
      const linkedEvents = (stop.linkedEvents as any[]) || []
      linkedEvents.push({ id: event_record.id, title: event_record.title })
      await prisma.tripStop.update({
        where: { id: stopId },
        data: { linkedEvents }
      })
    }
  }

  return apiSuccess(event_record)
}
