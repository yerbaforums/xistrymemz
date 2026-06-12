import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: tripId, stopId } = await params
  const body = await request.json()

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return apiError("Not found or no edit permission", 404)
  }

  const stop = await prisma.tripStop.findFirst({
    where: { id: stopId, tripId }
  })

  if (!stop) {
    return apiError("Stop not found", 404)
  }

  const updated = await prisma.tripStop.update({
    where: { id: stopId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.day !== undefined && { day: body.day }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.arrivalTime !== undefined && { arrivalTime: body.arrivalTime }),
      ...(body.departureTime !== undefined && { departureTime: body.departureTime }),
      ...(body.savedLocationId !== undefined && { savedLocationId: body.savedLocationId }),
      ...(body.links !== undefined && { links: body.links }),
      ...(body.shoppingList !== undefined && { shoppingList: body.shoppingList }),
      ...(body.linkedRequests !== undefined && { linkedRequests: body.linkedRequests }),
      ...(body.linkedEvents !== undefined && { linkedEvents: body.linkedEvents }),
      ...(body.linkedProducts !== undefined && { linkedProducts: body.linkedProducts })
    }
  })

  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: tripId, stopId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return apiError("Not found or no edit permission", 404)
  }

  await prisma.tripStop.delete({ where: { id: stopId } })
  return apiSuccess({ success: true })
}
