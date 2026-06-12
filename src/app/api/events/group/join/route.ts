import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const { eventId } = body

    if (!eventId) {
      return apiError("Event ID required", 400)
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return apiError("Event not found", 404)
    }

    if (event.maxJoiners > 0) {
      const joinerCount = await prisma.eventJoiner.count({
        where: { eventId }
      })
      if (joinerCount >= event.maxJoiners) {
        return apiError("Event is full", 400)
      }
    }

    const existingJoiner = await prisma.eventJoiner.findUnique({
      where: {
        eventId_userId: { eventId, userId: session.user.id }
      }
    })

    if (existingJoiner) {
      return apiError("Already joined", 400)
    }

    const joiner = await prisma.eventJoiner.create({
      data: {
        eventId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true, joiner })
  } catch (error) {
    console.error('Error joining event:', error)
    return apiError("Failed to join event", 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return apiError("Event ID required", 400)
    }

    await prisma.eventJoiner.delete({
      where: {
        eventId_userId: { eventId, userId: session.user.id }
      }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error leaving event:', error)
    return apiError("Failed to leave event", 500)
  }
}