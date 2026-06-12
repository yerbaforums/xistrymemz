import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getTrip(id: string, userId: string) {
  return prisma.trip.findFirst({
    where: {
      id,
      OR: [
        { userId },
        { collaborators: { some: { userId, status: 'ACCEPTED' } } }
      ]
    },
    include: {
      stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      user: { select: { id: true, name: true, image: true } },
      collaborators: { include: { user: { select: { id: true, name: true, image: true } } } }
    }
  })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const trip = await getTrip(id, session.user.id)

  if (!trip) {
    return apiError("Not found", 404)
  }

  return apiSuccess(trip)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const body = await request.json()

  const trip = await prisma.trip.findFirst({
    where: {
      id,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return apiError("Not found or no edit permission", 404)
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      ...(body.startDate !== undefined && { startDate: body.startDate ? new Date(body.startDate) : null }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic })
    },
    include: {
      stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      user: { select: { id: true, name: true, image: true } },
      collaborators: { include: { user: { select: { id: true, name: true, image: true } } } }
    }
  })

  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  const trip = await prisma.trip.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!trip) {
    return apiError("Not found", 404)
  }

  await prisma.trip.delete({ where: { id } })
  return apiSuccess({ success: true })
}
