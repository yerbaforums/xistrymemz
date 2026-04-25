import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, email: true, image: true }
        },
        plan: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        school: { select: { id: true, schoolName: true, name: true } },
        shop: { select: { id: true, shopName: true, name: true } },
        _count: {
          select: { eventJoiners: true }
        },
        eventJoiners: {
          select: {
            id: true,
            userId: true,
            user: {
              select: { name: true, email: true, image: true }
            }
          },
          take: 50
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const isOrganizer = session?.user?.id === event.organizerId
    const joined = session?.user?.id 
      ? event.eventJoiners.some(j => j.userId === session.user.id)
      : false

    const linkedTitle = event.plan?.title || event.group?.name || event.school?.schoolName || event.shop?.shopName || null

    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      eventCategory: event.eventCategory,
      eventDate: event.eventDate?.toISOString() || null,
      endDate: event.endDate?.toISOString() || null,
      location: event.location,
      locationDetails: event.locationDetails,
      latitude: event.latitude,
      longitude: event.longitude,
      maxJoiners: event.maxJoiners,
      pinned: event.pinned,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      planId: event.planId,
      planTitle: linkedTitle,
      userId: event.organizerId,
      userName: event.organizer.name,
      organizer: event.organizer,
      group: event.group,
      joiners: event.eventJoiners.map(j => ({
        id: j.id,
        userId: j.userId,
        user: j.user
      })),
      joined,
      isOrganizer,
      _count: event._count
    })
  } catch (error) {
    console.error('GET /api/events/[id]:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}