import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return apiError("Event not found", 404)
    if (event.organizerId !== session.user.id) {
      return apiError("Only the organizer can manage tickets", 403)
    }

    let body: any
    try { body = await request.json() } catch { return apiError("Invalid JSON body", 400) }
    const { action } = body

    const ticket = await prisma.eventTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) return apiError("Ticket not found", 404)

    switch (action) {
      case 'approve':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'APPROVED' },
        })
        break
      case 'verify':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'VERIFIED', verifiedAt: new Date() },
        })
        break
      case 'cancel':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'CANCELLED' },
        })
        break
      case 'mark-paid':
        await prisma.eventTicket.update({
          where: { id: ticketId },
          data: { paymentStatus: 'PAID' },
        })
        break
      default:
        return apiError("Invalid action", 400)
    }

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('PUT ticket verify error:', error)
    return apiError("Failed to update ticket", 500)
  }
}
