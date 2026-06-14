import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiUnauthorized()
  }

  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const eventId = searchParams.get('eventId') || undefined

    const organizedEventIds = await prisma.event.findMany({
      where: { organizerId: session.user.id },
      select: { id: true },
    })
    const eventIds = organizedEventIds.map(e => e.id)

    const ticketWhere: Record<string, unknown> = {
      eventId: eventId ? eventId : { in: eventIds },
    }
    if (status) {
      ticketWhere.paymentStatus = status
    }

    const tickets = await prisma.eventTicket.findMany({
      where: ticketWhere as any,
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        event: { select: { id: true, title: true, eventDate: true, ticketPrice: true, currency: true } },
      },
      orderBy: { purchasedAt: 'desc' },
    })

    const grouped: Record<string, {
      event: { id: string; title: string; eventDate: Date | null; ticketPrice: number; currency: string }
      tickets: typeof tickets
    }> = {}

    for (const t of tickets) {
      if (!grouped[t.eventId]) {
        grouped[t.eventId] = { event: t.event, tickets: [] }
      }
      grouped[t.eventId].tickets.push(t)
    }

    return apiSuccess({ tickets, grouped })
  } catch (error) {
    console.error('GET dashboard/tickets error:', error)
    return apiError('Failed to load tickets', 500)
  }
}
