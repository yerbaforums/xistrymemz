import { prisma } from '@/lib/prisma'
import { apiSuccess, apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

// Who's live right now: users in active video/audio rooms.
// Staleness rule (no schema change): the participant row must be open
// (leftAt null) AND joined within the last 6h — rooms left open go dark
// on their own. Passport-hidden users are excluded from the public rail.
const STALE_MS = 6 * 3600 * 1000

function prefsHidden(prefs: unknown): boolean {
  if (!prefs || typeof prefs !== 'object') return false
  const privacy = (prefs as Record<string, unknown>).privacy
  if (!privacy || typeof privacy !== 'object') return false
  return (privacy as Record<string, unknown>).passportVisibility === 'hidden'
}

export async function GET() {
  try {
    const since = new Date(Date.now() - STALE_MS)
    const rooms = await prisma.videoRoom.findMany({
      where: {
        isActive: true,
        participants: { some: { leftAt: null, joinedAt: { gte: since } } },
      },
      include: {
        createdBy: { select: { id: true, name: true, image: true, username: true, preferences: true } },
        participants: {
          where: { leftAt: null, joinedAt: { gte: since } },
          include: { user: { select: { id: true, name: true, image: true, username: true, preferences: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    })

    const seen = new Set<string>()
    const live: Array<{
      user: { id: string; name: string | null; image: string | null; username: string | null }
      roomId: string
      inviteCode: string
      mode: string
      roomName: string | null
      podcastSlug: string | null
      viewers: number
      isHost: boolean
    }> = []
    for (const room of rooms) {
      const viewers = room.participants.length
      const people: Array<{ u: { id: string; name: string | null; image: string | null; username: string | null; preferences: unknown }; host: boolean }> = [
        { u: room.createdBy, host: true },
        ...room.participants.map(p => ({ u: p.user, host: p.user.id === room.createdById })),
      ]
      for (const { u, host } of people) {
        if (!u || seen.has(u.id) || prefsHidden(u.preferences)) continue
        seen.add(u.id)
        live.push({
          user: { id: u.id, name: u.name, image: u.image, username: u.username },
          roomId: room.id,
          inviteCode: room.inviteCode,
          mode: room.mode,
          roomName: room.name,
          podcastSlug: room.podcastSlug,
          viewers,
          isHost: host,
        })
      }
    }
    return apiSuccess({ live })
  } catch (error) {
    console.error('Error fetching live presence:', error)
    return apiError('Failed to fetch live presence', 500)
  }
}
