import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id: planId, eventId } = await params

    let body;
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const { message } = body

    if (!message || !message.trim()) {
      return apiError("Message is required", 400)
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      select: { userId: true }
    })

    if (!plan || plan.userId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventJoiners: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
      }
    })

    if (!event) {
      return apiError("Event not found", 404)
    }

    const senderId = session.user.id

    const messagePromises = event.eventJoiners.map((joiner) => {
      if (joiner.userId !== senderId) {
        return prisma.message.create({
          data: {
            senderId,
            receiverId: joiner.userId,
            content: `[Event: ${event.title}] ${message}`
          }
        })
      }
      return Promise.resolve(null)
    })

    await Promise.all(messagePromises)

    return NextResponse.json({ 
      success: true, 
      message: `Message sent to ${event.eventJoiners.length - 1} attendee(s)`
    })
  } catch (error) {
    console.error('Bulk message error:', error)
    return apiError("Failed to send message", 500)
  }
}