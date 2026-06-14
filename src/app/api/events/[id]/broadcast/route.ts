import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiUnauthorized()
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, organizerId: true },
    })
    if (!event) return apiNotFound('Event not found')
    if (event.organizerId !== session.user.id) {
      return apiError('Only the organizer can broadcast messages', 403)
    }

    const body = await request.json().catch(() => ({ message: '' }))
    const { message } = body
    if (!message || !message.trim()) {
      return apiError('Message is required', 400)
    }

    const joiners = await prisma.eventJoiner.findMany({
      where: { eventId: id },
      select: { userId: true },
    })

    const notifications = joiners.map(j =>
      createNotification({
        type: 'SYSTEM',
        userId: j.userId,
        message: `${message.trim()} — "${event.title}"`,
        link: `/events/${event.id}`,
      } as any)
    )

    await Promise.allSettled(notifications)

    return apiSuccess({ sent: joiners.length, message: `Message broadcast to ${joiners.length} attendee(s)` })
  } catch (error) {
    console.error('POST /api/events/[id]/broadcast:', error)
    return apiError('Failed to broadcast message', 500)
  }
}
