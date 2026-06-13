import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized - Please log in", 401)
  }

  const { eventId } = await params
  
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  })

  if (!event) {
    return apiError("Event not found", 404)
  }

  const existingJoiner = await prisma.eventJoiner.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id }
    }
  })

  if (existingJoiner) {
    return apiError("Already joined", 400)
  }

  if (event.maxJoiners > 0) {
    const joinerCount = await prisma.eventJoiner.count({
      where: { eventId }
    })
    if (joinerCount >= event.maxJoiners) {
      return apiError("Event is full", 400)
    }
  }

  try {
    const joiner = await prisma.eventJoiner.create({
      data: {
        eventId,
        userId: session.user.id
      }
    })

    return apiSuccess(joiner)
  } catch (error: unknown) {
    console.error('Error joining event:', error)
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return apiError("Already joined this event", 400)
    }
    return apiError("Failed to join event", 500)
  }
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

  const existingJoiner = await prisma.eventJoiner.findUnique({
    where: {
      eventId_userId: { eventId, userId: session.user.id }
    }
  })

  if (!existingJoiner) {
    return apiError("Not joined", 400)
  }

  await prisma.eventJoiner.delete({
    where: { id: existingJoiner.id }
  })

  return apiSuccess({ success: true })
}