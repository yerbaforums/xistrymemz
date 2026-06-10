import { NextResponse } from 'next/server'
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (event.organizerId !== session.user.id) {
      return NextResponse.json({ error: 'Only the organizer can manage tickets' }, { status: 403 })
    }

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const { action } = body

    const ticket = await prisma.eventTicket.findUnique({ where: { id: ticketId } })
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

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
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT ticket verify error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
