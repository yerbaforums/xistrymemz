import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiUnauthorized()
  }

  try {
    const ticket = await prisma.eventTicket.findUnique({
      where: { ticketCode: code },
      select: {
        id: true,
        paymentStatus: true,
        event: { select: { organizerId: true, title: true } },
        user: { select: { id: true, name: true } },
      },
    })

    if (!ticket) {
      return apiError('Ticket not found', 404)
    }

    if (ticket.event.organizerId !== session.user.id) {
      return apiError('Only the event organizer can scan tickets', 403)
    }

    if (ticket.paymentStatus === 'APPROVED') {
      return apiError('This ticket has already been used', 400)
    }

    if (ticket.paymentStatus === 'CANCELLED') {
      return apiError('This ticket has been cancelled', 400)
    }

    if (ticket.paymentStatus === 'PENDING') {
      return apiError('Payment has not been confirmed yet', 400)
    }

    await prisma.eventTicket.update({
      where: { id: ticket.id },
      data: {
        paymentStatus: 'APPROVED',
        scannedAt: new Date(),
        scannedBy: session.user.id,
        usedAt: new Date(),
      },
    })

    return apiSuccess({
      ticket: {
        ...ticket,
        paymentStatus: 'APPROVED',
      },
      message: `${ticket.user.name || 'Attendee'} checked in for "${ticket.event.title}"`,
    })
  } catch (error) {
    console.error('POST /api/tickets/[code]/scan:', error)
    return apiError('Failed to scan ticket', 500)
  }
}
