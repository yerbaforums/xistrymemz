import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code required' }, { status: 400 })
    }

    const room = await prisma.videoRoom.findUnique({
      where: { inviteCode },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (!room.isActive) {
      return NextResponse.json({ error: 'Room is no longer active' }, { status: 400 })
    }

    const existingParticipant = room.participants.find(p => p.userId === session.user.id && p.leftAt === null)
    if (!existingParticipant) {
      await prisma.videoRoomParticipant.create({
        data: { roomId: room.id, userId: session.user.id },
      })
    }

    const updated = await prisma.videoRoom.findUnique({
      where: { id: room.id },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    })

    return NextResponse.json({ room: updated })
  } catch (error) {
    console.error('Error joining video room:', error)
    return NextResponse.json({ error: 'Failed to join room' }, { status: 500 })
  }
}
