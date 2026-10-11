import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// In-memory signaling store. For multi-process/serverless, replace with Redis.
const signalStore = new Map<string, { fromUserId: string; toUserId: string; type: string; data: unknown; timestamp: number }[]>()

function getSignals(roomId: string) {
  if (!signalStore.has(roomId)) signalStore.set(roomId, [])
  return signalStore.get(roomId)!
}

// POST: send a signal (offer, answer, ice-candidate) or a room chat
// message (type 'chat' with toUserId 'all', broadcast to participants)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const body = await request.json()
    const { type, toUserId, data } = body

    if (!type || !toUserId || data === undefined || data === null) {
      return apiError("Missing type, toUserId, or data", 400)
    }

    // Verify user is a participant in the room
    const participant = await prisma.videoRoomParticipant.findUnique({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
    })
    if (!participant || participant.leftAt) {
      return apiError("Not a participant", 403)
    }

    // Room chat: broadcast text to all current participants. Capped length,
    // trimmed; empty messages rejected.
    let payload: unknown = data
    let targetUserId: string = toUserId
    if (type === 'chat') {
      const text = typeof (data as Record<string, unknown>)?.text === 'string'
        ? ((data as Record<string, unknown>).text as string).trim().slice(0, 500)
        : ''
      if (!text) {
        return apiError("Message text is required", 400)
      }
      targetUserId = 'all'
      payload = { text }
    }

    const signals = getSignals(id)
    signals.push({
      fromUserId: session.user.id,
      toUserId: targetUserId,
      type,
      data: payload,
      timestamp: Date.now(),
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error sending signal:', error)
    return apiError("Failed to send signal", 500)
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
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const url = new URL(request.url)
    const since = parseInt(url.searchParams.get('since') || '0')

    const participant = await prisma.videoRoomParticipant.findUnique({
      where: { roomId_userId: { roomId: id, userId: session.user.id } },
    })
    if (!participant) {
      return apiError("Not a participant", 403)
    }

    const allSignals = getSignals(id)
    // Directed signals go to their recipient; chat broadcasts to everyone.
    const newSignals = allSignals.filter(
      s => (s.toUserId === session.user.id || (s.type === 'chat' && s.toUserId === 'all')) && s.timestamp > since
    )

    // Resolve sender display names for chat messages.
    const senderIds = [...new Set(newSignals.filter(s => s.type === 'chat').map(s => s.fromUserId))]
    const senders = senderIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: senderIds } },
          select: { id: true, name: true },
        })
      : []
    const names = new Map(senders.map(u => [u.id, u.name || 'Someone']))

    // Cleanup old signals (chat kept longer so late joiners see context).
    const now = Date.now()
    const cutoff = now - 60000 // 1 minute
    const chatCutoff = now - 3600000 // 1 hour
    signalStore.set(id, allSignals.filter(s =>
      s.type === 'chat' ? s.timestamp > chatCutoff : s.timestamp > cutoff
    ))

    return NextResponse.json({
      signals: newSignals.map(s => ({
        fromUserId: s.fromUserId,
        fromName: s.type === 'chat' ? (names.get(s.fromUserId) || 'Someone') : undefined,
        type: s.type,
        data: s.data,
      })),
      now,
    })
  } catch (error) {
    console.error('Error fetching signals:', error)
    return apiError("Failed to fetch signals", 500)
  }
}
