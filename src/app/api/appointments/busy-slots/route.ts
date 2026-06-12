import { NextRequest, apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const date = searchParams.get('date')

    if (!userId || !date) {
      return apiError("userId and date required", 400)
    }

    const dateStart = new Date(`${date}T00:00:00`)
    const dateEnd = new Date(`${date}T23:59:59`)

    const [confirmedAppointments, pendingAppointments, organizedEvents, joinedEvents] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          sellerId: userId,
          status: 'CONFIRMED',
          startTime: { gte: dateStart },
          endTime: { lte: dateEnd }
        },
        select: { id: true, title: true, startTime: true, endTime: true }
      }),
      prisma.appointment.findMany({
        where: {
          sellerId: userId,
          status: 'PENDING',
          startTime: { gte: dateStart },
          endTime: { lte: dateEnd }
        },
        select: { id: true, title: true, startTime: true, endTime: true }
      }),
      prisma.event.findMany({
        where: {
          organizerId: userId,
          eventDate: { lte: dateEnd },
          endDate: { gte: dateStart }
        },
        select: { id: true, title: true, eventDate: true, endDate: true }
      }),
      prisma.eventJoiner.findMany({
        where: {
          userId,
          event: {
            eventDate: { lte: dateEnd },
            endDate: { gte: dateStart }
          }
        },
        select: {
          event: {
            select: { id: true, title: true, eventDate: true, endDate: true }
          }
        }
      })
    ])

    const busySlots = [
      ...confirmedAppointments.map(a => ({
        type: 'CONFIRMED' as const,
        start: a.startTime.toISOString(),
        end: a.endTime.toISOString(),
        title: a.title
      })),
      ...pendingAppointments.map(a => ({
        type: 'PENDING' as const,
        start: a.startTime.toISOString(),
        end: a.endTime.toISOString(),
        title: a.title
      })),
      ...organizedEvents.map(e => ({
        type: 'EVENT' as const,
        start: e.eventDate?.toISOString() || '',
        end: e.endDate?.toISOString() || e.eventDate?.toISOString() || '',
        title: e.title
      })),
      ...joinedEvents.map(j => ({
        type: 'EVENT' as const,
        start: j.event.eventDate?.toISOString() || '',
        end: j.event.endDate?.toISOString() || j.event.eventDate?.toISOString() || '',
        title: j.event.title
      }))
    ]

    return apiSuccess({ slots: busySlots })
  } catch (error) {
    console.error('Error fetching busy slots:', error)
    return apiError("Failed to fetch busy slots", 500)
  }
}
