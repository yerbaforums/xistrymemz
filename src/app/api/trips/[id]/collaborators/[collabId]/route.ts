import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; collabId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId, collabId } = await params
  const body = await request.json()

  const collaborator = await prisma.tripCollaborator.findFirst({
    where: { id: collabId, tripId },
    include: { trip: true }
  })

  if (!collaborator) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Owner can update role; collaborator can update status
  const isOwner = collaborator.trip.userId === session.user.id
  const isSelf = collaborator.userId === session.user.id

  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: any = {}

  if (body.status !== undefined && isSelf) {
    data.status = body.status
  }
  if (body.role !== undefined && isOwner) {
    data.role = body.role
  }

  const updated = await prisma.tripCollaborator.update({
    where: { id: collabId },
    data,
    include: { user: { select: { id: true, name: true, image: true } } }
  })

  return NextResponse.json(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; collabId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId, collabId } = await params

  const collaborator = await prisma.tripCollaborator.findFirst({
    where: { id: collabId, tripId },
    include: { trip: true }
  })

  if (!collaborator) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isOwner = collaborator.trip.userId === session.user.id
  const isSelf = collaborator.userId === session.user.id

  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.tripCollaborator.delete({ where: { id: collabId } })
  return NextResponse.json({ success: true })
}
