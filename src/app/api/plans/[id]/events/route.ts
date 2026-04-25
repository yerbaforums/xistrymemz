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

  const events = await prisma.event.findMany({
    where: { planId: id },
    include: {
      eventJoiners: {
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

  let body;
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, description, eventCategory, eventDate, location, locationDetails, maxJoiners, isTicketed, ticketPrice, currency } = body

  const plan = await prisma.plan.findFirst({
    where: { id }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const isOwner = plan.userId === session.user.id
  const isEditor = await prisma.planEditor.findFirst({
    where: { planId: id, userId: session.user.id }
  })
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isEditor && !isAdmin) {
    return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
  }

  let latitude: number | null = null
  let longitude: number | null = null

  if (location) {
    const geocodeResult = await geocodeLocation(location)
    if (geocodeResult) {
      latitude = geocodeResult.latitude
      longitude = geocodeResult.longitude
    }
  }

  const event = await prisma.event.create({
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
      planId: id,
      organizerId: session.user.id
    }
  })

  return NextResponse.json(event)
}