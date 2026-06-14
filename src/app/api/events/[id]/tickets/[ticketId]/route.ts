import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  const { id, ticketId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, title: true, organizerId: true, isVirtual: true, meetingLink: true },
    })
    if (!event) return apiError("Event not found", 404)
    if (event.organizerId !== session.user.id) {
      return apiError("Only the organizer can manage tickets", 403)
    }

    let body: any
    try { body = await request.json() } catch { return apiError("Invalid JSON body", 400) }
    const { action } = body

    const ticket = await prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true } } },
    })
    if (!ticket) return apiError("Ticket not found", 404)

    switch (action) {
      case 'mark-paid':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'PAID', paidAt: new Date() },
        })
        if (event.isVirtual && event.meetingLink) {
          try {
            await createNotification({
              type: 'TICKET_PAID',
              userId: ticket.userId,
              message: `Your ticket for "${event.title}" is confirmed! Meeting link: ${event.meetingLink}`,
              link: `/events/${event.id}`,
            } as any)
          } catch (e) { console.error('Failed to send meeting link notification:', e) }
        }
        break
      case 'approve':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'APPROVED', usedAt: new Date() },
        })
        break
      case 'scan':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: {
            paymentStatus: 'APPROVED',
            scannedAt: new Date(),
            scannedBy: session.user.id,
            usedAt: new Date(),
          },
        })
        break
      case 'cancel':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'CANCELLED' },
        })
        break
      default:
        return apiError("Invalid action", 400)
    }

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('PUT ticket error:', error)
    return apiError("Failed to update ticket", 500)
  }
}
