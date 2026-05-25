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

  const [ownedTrips, sharedTrips] = await Promise.all([
    prisma.trip.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
        collaborators: { include: { user: { select: { id: true, name: true, image: true } } } }
      }
    }),
    prisma.trip.findMany({
      where: {
        collaborators: { some: { userId, status: 'ACCEPTED' } }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
        user: { select: { id: true, name: true, image: true } },
        collaborators: { include: { user: { select: { id: true, name: true, image: true } } } }
      }
    })
  ])

  return NextResponse.json({ owned: ownedTrips, shared: sharedTrips })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, startDate, endDate, isPublic, coverImage } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const trip = await prisma.trip.create({
    data: {
      title: title.trim(),
      description: description || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isPublic: isPublic ?? false,
      coverImage: coverImage || null,
      userId: session.user.id,
      collaborators: {
        create: { userId: session.user.id, role: 'OWNER', status: 'ACCEPTED' }
      }
    },
    include: {
      stops: { orderBy: [{ day: 'asc' }, { order: 'asc' }] },
      collaborators: { include: { user: { select: { id: true, name: true, image: true } } } }
    }
  })

  return NextResponse.json(trip)
}
