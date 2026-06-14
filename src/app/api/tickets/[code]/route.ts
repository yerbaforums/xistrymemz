import { apiSuccess, apiError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  try {
    const ticket = await prisma.eventTicket.findUnique({
      where: { ticketCode: code },
      select: {
        id: true,
        ticketCode: true,
        quantity: true,
        paymentStatus: true,
        purchasedAt: true,
        paidAt: true,
        scannedAt: true,
        usedAt: true,
        txHash: true,
        selectedCurrency: true,
        user: { select: { id: true, name: true } },
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            isVirtual: true,
            meetingLink: true,
            organizerId: true,
            organizer: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!ticket) {
      return apiError('Ticket not found', 404)
    }

    return apiSuccess({ ticket })
  } catch (error) {
    console.error('GET /api/tickets/[code]:', error)
    return apiError('Failed to fetch ticket', 500)
  }
}
