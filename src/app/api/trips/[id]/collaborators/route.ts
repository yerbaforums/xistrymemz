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
    where: { id: tripId, userId: session.user.id }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })
  }

  const body = await request.json()
  const { userId, role } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const existing = await prisma.tripCollaborator.findUnique({
    where: { tripId_userId: { tripId, userId } }
  })

  if (existing) {
    return NextResponse.json({ error: 'Already a collaborator' }, { status: 409 })
  }

  const collaborator = await prisma.tripCollaborator.create({
    data: {
      tripId,
      userId,
      role: role || 'VIEWER',
      status: 'PENDING'
    },
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  return NextResponse.json(collaborator)
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

  const collaborators = await prisma.tripCollaborator.findMany({
    where: { tripId },
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  return NextResponse.json(collaborators)
}
