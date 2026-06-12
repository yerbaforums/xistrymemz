import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const plan = await prisma.plan.findUnique({
    where: { id, published: true },
    include: {
      user: { select: { name: true } },
      joiners: {
        include: { user: { select: { name: true, email: true } } }
      },
      events: true,
      _count: { select: { joiners: true, requests: true } }
    }
  })

  if (!plan) {
    return apiError("Event not found", 404)
  }

  const event = plan.events[0]

  return NextResponse.json({
    ...plan,
    eventDate: event?.eventDate ? event.eventDate.toISOString() : null,
    eventCategory: event?.eventCategory || null,
    location: event?.location || null,
    locationDetails: event?.locationDetails || null,
    latitude: event?.latitude || null,
    longitude: event?.longitude || null,
    maxJoiners: event?.maxJoiners || 0,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  })
}
