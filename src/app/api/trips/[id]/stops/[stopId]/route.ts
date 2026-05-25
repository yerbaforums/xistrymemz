import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId, stopId } = await params
  const body = await request.json()

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found or no edit permission' }, { status: 404 })
  }

  const stop = await prisma.tripStop.findFirst({
    where: { id: stopId, tripId }
  })

  if (!stop) {
    return NextResponse.json({ error: 'Stop not found' }, { status: 404 })
  }

  const updated = await prisma.tripStop.update({
    where: { id: stopId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.day !== undefined && { day: body.day }),
      ...(body.order !== undefined && { order: body.order }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.arrivalTime !== undefined && { arrivalTime: body.arrivalTime }),
      ...(body.departureTime !== undefined && { departureTime: body.departureTime }),
      ...(body.savedLocationId !== undefined && { savedLocationId: body.savedLocationId })
    }
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId, stopId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found or no edit permission' }, { status: 404 })
  }

  await prisma.tripStop.delete({ where: { id: stopId } })
  return NextResponse.json({ success: true })
}
