import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const [organizedEvents, joinedPlanEvents, joinedGroupEvents, userEvents] = await Promise.all([
    prisma.planEvent.findMany({
      where: { plan: { userId } },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        eventCategory: true,
        location: true,
        locationDetails: true,
        latitude: true,
        longitude: true,
        maxJoiners: true,
        isTicketed: true,
        ticketPrice: true,
        currency: true,
        createdAt: true,
        plan: { select: { id: true, title: true } },
        _count: { select: { joiners: true } }
      }
    }),
    prisma.planEventJoiner.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            eventDate: true,
            eventCategory: true,
            location: true,
            locationDetails: true,
            latitude: true,
            longitude: true,
            maxJoiners: true,
            isTicketed: true,
            ticketPrice: true,
            currency: true,
            createdAt: true,
            plan: { select: { id: true, title: true } },
            _count: { select: { joiners: true } }
          }
        }
      }
    }),
    prisma.groupEventJoiner.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            eventDate: true,
            eventCategory: true,
            location: true,
            locationDetails: true,
            latitude: true,
            longitude: true,
            maxJoiners: true,
            isTicketed: true,
            ticketPrice: true,
            currency: true,
            createdAt: true,
            _count: { select: { eventJoiners: true, eventTickets: true } }
          }
        }
      }
    }),
    prisma.userEvent.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        color: true,
        visibility: true,
        createdAt: true
      }
    })
  ])

  const events = [
    ...organizedEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate?.toISOString() || null,
      eventCategory: e.eventCategory,
      location: e.location,
      locationDetails: e.locationDetails,
      latitude: e.latitude,
      longitude: e.longitude,
      maxJoiners: e.maxJoiners,
      isTicketed: e.isTicketed,
      ticketPrice: e.ticketPrice,
      currency: e.currency,
      joinerCount: e._count.joiners,
      type: 'ORGANIZED',
      planTitle: e.plan?.title || null,
      planId: e.plan?.id || null,
      createdAt: e.createdAt.toISOString()
    })),
    ...joinedPlanEvents.map(j => ({
      id: j.event.id,
      title: j.event.title,
      description: j.event.description,
      eventDate: j.event.eventDate?.toISOString() || null,
      eventCategory: j.event.eventCategory,
      location: j.event.location,
      locationDetails: j.event.locationDetails,
      latitude: j.event.latitude,
      longitude: j.event.longitude,
      maxJoiners: j.event.maxJoiners,
      isTicketed: j.event.isTicketed,
      ticketPrice: j.event.ticketPrice,
      currency: j.event.currency,
      joinerCount: j.event._count.joiners,
      type: 'JOINED_PLAN',
      planTitle: j.event.plan?.title || null,
      planId: j.event.plan?.id || null,
      createdAt: j.event.createdAt.toISOString()
    })),
    ...joinedGroupEvents.map(j => ({
      id: j.event.id,
      title: j.event.title,
      description: j.event.description,
      eventDate: j.event.eventDate?.toISOString() || null,
      eventCategory: j.event.eventCategory,
      location: j.event.location,
      locationDetails: j.event.locationDetails,
      latitude: j.event.latitude,
      longitude: j.event.longitude,
      maxJoiners: j.event.maxJoiners,
      isTicketed: j.event.isTicketed,
      ticketPrice: j.event.ticketPrice,
      currency: j.event.currency,
      joinerCount: (j.event._count as { eventJoiners: number }).eventJoiners,
      type: 'JOINED_GROUP',
      planTitle: null,
      planId: null,
      createdAt: j.event.createdAt.toISOString()
    })),
    ...userEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventDate: e.startDate?.toISOString() || null,
      eventCategory: 'PERSONAL',
      location: e.location,
      locationDetails: null,
      latitude: null,
      longitude: null,
      maxJoiners: 0,
      isTicketed: false,
      ticketPrice: 0,
      currency: 'USD',
      joinerCount: 0,
      type: 'PERSONAL',
      planTitle: null,
      planId: null,
      createdAt: e.createdAt.toISOString()
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(events)
}