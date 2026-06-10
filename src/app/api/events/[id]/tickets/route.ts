import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const isOrganizer = event.organizerId === session.user.id
    const tickets = await prisma.eventTicket.findMany({
      where: isOrganizer ? { eventId: id } : { eventId: id, userId: session.user.id },
      include: isOrganizer ? {
        user: { select: { id: true, name: true, image: true, username: true } },
      } : undefined,
      orderBy: { purchasedAt: 'desc' },
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('GET tickets error:', error)
    return NextResponse.json({ error: 'Failed to load tickets' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (!event.isTicketed) return NextResponse.json({ error: 'This event is not ticketed' }, { status: 400 })

    if (event.maxJoiners > 0) {
      const joinerCount = await prisma.eventJoiner.count({ where: { eventId: id } })
      if (joinerCount >= event.maxJoiners) {
        return NextResponse.json({ error: 'Event is full' }, { status: 400 })
      }
    }

    let body: any
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
    const { quantity = 1 } = body

    const totalPaid = event.ticketPrice * quantity

    const existing = await prisma.eventTicket.findUnique({
      where: { eventId_userId: { eventId: id, userId: session.user.id } }
    })
    if (existing) {
      return NextResponse.json({ error: 'You already have tickets for this event' }, { status: 400 })
    }

    const ticket = await prisma.eventTicket.create({
      data: {
        eventId: id,
        userId: session.user.id,
        quantity,
        totalPaid,
        paymentStatus: 'PENDING',
      },
    })

    await prisma.eventJoiner.upsert({
      where: { eventId_userId: { eventId: id, userId: session.user.id } },
      update: { role: 'ATTENDEE' },
      create: { eventId: id, userId: session.user.id, role: 'ATTENDEE' },
    })

    return NextResponse.json({ ticket }, { status: 201 })
  } catch (error) {
    console.error('POST ticket error:', error)
    return NextResponse.json({ error: 'Failed to purchase ticket' }, { status: 500 })
  }
}
