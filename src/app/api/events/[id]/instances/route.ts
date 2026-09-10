import { NextRequest, apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseRRule } from '@/lib/recurrence'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      select: { id: true, recurrenceRule: true, recurrenceEnd: true, eventDate: true }
    })

    if (!event) {
      return apiError('Event not found', 404)
    }

    const childEvents = await prisma.event.findMany({
      where: { parentEventId: id },
      include: {
        organizer: { select: { id: true, name: true, image: true } },
        _count: { select: { eventJoiners: true } },
      },
      orderBy: { eventDate: 'asc' },
    })

    let computedInstances: Array<{
      date: Date
      isPersisted: boolean
      childEventId: string | null
    }> = []

    if (event.recurrenceRule && event.eventDate) {
      const allDates = parseRRule(event.recurrenceRule, event.eventDate)
      const persistedDates = new Set(
        childEvents
          .map(e => e.eventDate?.toISOString().slice(0, 10))
          .filter(Boolean)
      )

      for (const d of allDates) {
        const dateStr = d.toISOString().slice(0, 10)
        const child = childEvents.find(e => e.eventDate?.toISOString().slice(0, 10) === dateStr)
        computedInstances.push({
          date: d,
          isPersisted: !!child,
          childEventId: child?.id || null,
        })
      }
    } else {
      computedInstances = childEvents.map(e => ({
        date: e.eventDate || new Date(),
        isPersisted: true,
        childEventId: e.id,
      }))
    }

    return apiSuccess({
      parentEvent: {
        id: event.id,
        recurrenceRule: event.recurrenceRule,
        recurrenceEnd: event.recurrenceEnd,
        eventDate: event.eventDate,
      },
      instances: computedInstances,
      persistedEvents: childEvents,
    })
  } catch (error) {
    console.error('GET /api/events/[id]/instances:', error)
    return apiError('Failed to fetch instances', 500)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const parentEvent = await prisma.event.findUnique({ where: { id } })
    if (!parentEvent) {
      return apiError('Event not found', 404)
    }

    if (parentEvent.organizerId !== session.user.id) {
      return apiError('Forbidden', 403)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const { date, title, description, location } = body
    if (!date) {
      return apiError('Date is required', 400)
    }

    const eventDate = new Date(date)
    const existingChild = await prisma.event.findFirst({
      where: {
        parentEventId: id,
        eventDate: eventDate,
      },
    })

    let childEvent
    if (existingChild) {
      childEvent = await prisma.event.update({
        where: { id: existingChild.id },
        data: {
          overrideTitle: title || existingChild.overrideTitle,
          overrideDescription: description || existingChild.overrideDescription,
          location: location || existingChild.location,
        },
      })
    } else {
      childEvent = await prisma.event.create({
        data: {
          title: title || parentEvent.title,
          description: description || parentEvent.description || '',
          eventDate,
          endDate: parentEvent.endDate,
          location: location || parentEvent.location,
          organizerId: session.user.id,
          parentEventId: id,
          projectId: parentEvent.projectId,
          groupId: parentEvent.groupId,
          overrideTitle: title || null,
          overrideDescription: description || null,
          recurrenceMeta: JSON.stringify({
            parentEventId: id,
            originalDate: eventDate.toISOString(),
            instanceIndex: 0,
          }),
        },
      })
    }

    return apiSuccess(childEvent)
  } catch (error) {
    console.error('POST /api/events/[id]/instances:', error)
    return apiError('Failed to create instance', 500)
  }
}
