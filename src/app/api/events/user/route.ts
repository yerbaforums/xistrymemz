import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
        location: true,
        isTicketed: true,
        ticketPrice: true,
        createdAt: true
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
            location: true,
            isTicketed: true,
            ticketPrice: true,
            createdAt: true
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
            location: true,
            isTicketed: true,
            ticketPrice: true,
            createdAt: true
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
        createdAt: true
      }
    })
  ])

  const events = [
    ...organizedEvents.map(e => ({ ...e, type: 'ORGANIZED', eventDate: e.eventDate })),
    ...joinedPlanEvents.map(j => ({ ...j.event, type: 'JOINED_PLAN', eventDate: j.event.eventDate })),
    ...joinedGroupEvents.map(j => ({ ...j.event, type: 'JOINED_GROUP', eventDate: j.event.eventDate })),
    ...userEvents.map(e => ({ ...e, type: 'USER', eventDate: e.startDate, isTicketed: false, ticketPrice: 0 }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(events)
}
