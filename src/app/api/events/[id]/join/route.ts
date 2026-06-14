import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body: { role?: string } = {}
    try {
      body = await request.json()
    } catch {}

    const role = body.role === 'VOLUNTEER' ? 'VOLUNTEER' : 'ATTENDEE'

    const event = await prisma.event.findUnique({
      where: { id },
      select: { 
        id: true, 
        maxJoiners: true,
        eventDate: true,
        needsVolunteers: true,
        isTicketed: true,
        _count: { select: { eventJoiners: true } }
      }
    })

    if (!event) {
      return apiError("Event not found", 404)
    }

    if (event.eventDate && new Date(event.eventDate) < new Date()) {
      return apiError("Event has already occurred", 400)
    }

    if (event.maxJoiners > 0 && event._count.eventJoiners >= event.maxJoiners) {
      return apiError("Event is full", 400)
    }

    if (event.isTicketed) {
      const ticket = await prisma.eventTicket.findUnique({
        where: { eventId_userId: { eventId: id, userId: session.user.id } }
      })
      if (!ticket || !['PAID', 'APPROVED'].includes(ticket.paymentStatus)) {
        return apiError("You need a confirmed ticket to join this event", 403)
      }
    }

    const existing = await prisma.eventJoiner.findUnique({
      where: {
        eventId_userId: {
          eventId: id,
          userId: session.user.id
        }
      }
    })

    if (existing) {
      return apiError("Already joined", 400)
    }

    await prisma.eventJoiner.create({
      data: {
        eventId: id,
        userId: session.user.id,
        role
      }
    })

    return NextResponse.json({ success: true, role })
  } catch (error) {
    console.error('POST /api/events/[id]/join:', error)
    return apiError("Failed to join event", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    await prisma.eventJoiner.deleteMany({
      where: {
        eventId: id,
        userId: session.user.id
      }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/events/[id]/join:', error)
    return apiError("Failed to leave event", 500)
  }
}