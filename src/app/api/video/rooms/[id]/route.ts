import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const room = await prisma.videoRoom.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const isParticipant = room.participants.some(p => p.userId === session.user.id)
    if (!isParticipant && room.createdById !== session.user.id) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    return NextResponse.json({ room })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json({ error: 'Failed to fetch room' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const room = await prisma.videoRoom.findUnique({ where: { id } })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.createdById !== session.user.id) {
      // Leave instead of delete
      await prisma.videoRoomParticipant.updateMany({
        where: { roomId: id, userId: session.user.id, leftAt: null },
        data: { leftAt: new Date() },
      })
      return NextResponse.json({ success: true, left: true })
    }

    await prisma.videoRoom.update({
      where: { id },
      data: {
        isActive: false,
        endedAt: new Date(),
        participants: {
          updateMany: { where: { leftAt: null }, data: { leftAt: new Date() } },
        },
      },
    })

    return NextResponse.json({ success: true, ended: true })
  } catch (error) {
    console.error('Error ending room:', error)
    return NextResponse.json({ error: 'Failed to end room' }, { status: 500 })
  }
}
