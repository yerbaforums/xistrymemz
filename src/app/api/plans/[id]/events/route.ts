import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const events = await prisma.planEvent.findMany({
    where: { planId: id },
    include: {
      joiners: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    },
    orderBy: { eventDate: 'asc' }
  })

  return NextResponse.json(events)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { title, description, eventCategory, eventDate, location, locationDetails, maxJoiners, isTicketed, ticketPrice, currency } = body

  const plan = await prisma.plan.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  let latitude = null
  let longitude = null

  if (location) {
    const geocodeResult = await geocodeLocation(location)
    if (geocodeResult) {
      latitude = geocodeResult.latitude
      longitude = geocodeResult.longitude
    }
  }

  const event = await prisma.planEvent.create({
    data: {
      title,
      description,
      eventCategory,
      eventDate: eventDate ? new Date(eventDate) : null,
      location,
      locationDetails,
      latitude,
      longitude,
      maxJoiners: maxJoiners || 0,
      isTicketed: isTicketed || false,
      ticketPrice: ticketPrice || 0,
      currency: currency || 'USD',
      planId: id
    }
  })

  return NextResponse.json(event)
}
