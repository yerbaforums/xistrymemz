import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found or no edit permission' }, { status: 404 })
  }

  const body = await request.json()
  const { name, location, latitude, longitude, day, order, notes, arrivalTime, departureTime, savedLocationId } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const stop = await prisma.tripStop.create({
    data: {
      tripId,
      name: name.trim(),
      location: location || null,
      latitude: latitude || null,
      longitude: longitude || null,
      day: day ?? 0,
      order: order ?? 0,
      notes: notes || null,
      arrivalTime: arrivalTime || null,
      departureTime: departureTime || null,
      savedLocationId: savedLocationId || null
    }
  })

  return NextResponse.json(stop)
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      OR: [
        { userId: session.user.id },
        { collaborators: { some: { userId: session.user.id } } }
      ]
    }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const stops = await prisma.tripStop.findMany({
    where: { tripId },
    orderBy: [{ day: 'asc' }, { order: 'asc' }],
    include: { savedLocation: true }
  })

  return NextResponse.json(stops)
}
