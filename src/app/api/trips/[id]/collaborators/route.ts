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
    where: { id: tripId, userId: session.user.id }
  })

  if (!trip) {
    return apiError("Not found or not owner", 404)
  }

  const body = await request.json()
  const { userId, role } = body

  if (!userId) {
    return apiError("userId is required", 400)
  }

  const existing = await prisma.tripCollaborator.findUnique({
    where: { tripId_userId: { tripId, userId } }
  })

  if (existing) {
    return apiError("Already a collaborator", 409)
  }

  const collaborator = await prisma.tripCollaborator.create({
    data: {
      tripId,
      userId,
      role: role || 'VIEWER',
      status: 'PENDING'
    },
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  return apiSuccess(collaborator)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: tripId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { userId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } }
      ]
    }
  })

  if (!trip) {
    return apiError("Not found", 404)
  }

  const collaborators = await prisma.tripCollaborator.findMany({
    where: { tripId },
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  return apiSuccess(collaborators)
}
