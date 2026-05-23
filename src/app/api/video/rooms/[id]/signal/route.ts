import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// In-memory signaling store. For multi-process/serverless, replace with Redis.
const signalStore = new Map<string, { fromUserId: string; toUserId: string; type: string; data: any; timestamp: number }[]>()

function getSignals(roomId: string) {
  if (!signalStore.has(roomId)) signalStore.set(roomId, [])
  return signalStore.get(roomId)!
}

// POST: send a signal (offer, answer, ice-candidate)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, toUserId, data } = body

    if (!type || !toUserId || !data) {
      return NextResponse.json({ error: 'Missing type, toUserId, or data' }, { status: 400 })
    }

    // Verify user is a participant in the room
    const participant = await prisma.videoRoomParticipant.findUnique({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
    })
    if (!participant || participant.leftAt) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const signals = getSignals(id)
    signals.push({
      fromUserId: session.user.id,
      toUserId,
      type,
      data,
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending signal:', error)
    return NextResponse.json({ error: 'Failed to send signal' }, { status: 500 })
  }
}

// GET: poll for signals (with optional since timestamp)
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
    const url = new URL(request.url)
    const since = parseInt(url.searchParams.get('since') || '0')

    const participant = await prisma.videoRoomParticipant.findUnique({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
    })
    if (!participant) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const allSignals = getSignals(id)
    const newSignals = allSignals.filter(
      s => s.toUserId === session.user.id && s.timestamp > since
    )

    // Cleanup old signals
    const cutoff = Date.now() - 60000 // 1 minute
    signalStore.set(id, allSignals.filter(s => s.timestamp > cutoff))

    return NextResponse.json({
      signals: newSignals.map(s => ({
        fromUserId: s.fromUserId,
        type: s.type,
        data: s.data,
      })),
      now: Date.now(),
    })
  } catch (error) {
    console.error('Error fetching signals:', error)
    return NextResponse.json({ error: 'Failed to fetch signals' }, { status: 500 })
  }
}
