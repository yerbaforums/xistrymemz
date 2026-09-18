import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  image: true,
} as const

function matchesQuery(u: { username: string | null; name: string | null }, q: string): boolean {
  const query = q.toLowerCase()
  return (
    (u.username || '').toLowerCase().startsWith(query) ||
    (u.name || '').toLowerCase().startsWith(query)
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const scope = searchParams.get('scope') || ''

    if (!q || q.length < 1) {
      return apiSuccess({ users: [], scope })
    }

    // Connections-scoped autosuggest: only accepted connections and confirmed
    // follows (both directions) so mentions surface people the user already knows.
    if (scope === 'connections') {
      const session = await getServerSession(authOptions)
      if (session?.user?.id) {
        const userId = session.user.id
        const [conns, follows] = await Promise.all([
          prisma.connection.findMany({
            where: {
              status: 'ACCEPTED',
              OR: [{ requesterId: userId }, { receiverId: userId }],
            },
            select: {
              requester: { select: USER_SELECT },
              receiver: { select: USER_SELECT },
            },
          }),
          prisma.follow.findMany({
            where: {
              status: 'ACCEPTED',
              OR: [{ followerId: userId }, { followedId: userId }],
            },
            select: {
              follower: { select: USER_SELECT },
              followed: { select: USER_SELECT },
            },
          }),
        ])

        const peers = new Map<
          string,
          { id: string; username: string | null; name: string | null; image: string | null }
        >()
        for (const c of conns) {
          const peer = c.requester.id === userId ? c.receiver : c.requester
          if (peer && peer.id !== userId) peers.set(peer.id, peer)
        }
        for (const f of follows) {
          const peer = f.follower.id === userId ? f.followed : f.follower
          if (peer && peer.id !== userId) peers.set(peer.id, peer)
        }

        const filtered = [...peers.values()]
          .filter(u => matchesQuery(u, q))
          .slice(0, 8)

        return apiSuccess({ users: filtered, scope: 'connections' })
      }
      // Not signed in — fall back to global search below.
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { startsWith: q, mode: 'insensitive' } },
          { name: { startsWith: q, mode: 'insensitive' } },
        ],
      },
      select: USER_SELECT,
      take: 8,
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess({ users, scope: 'global' })
  } catch (error) {
    console.error('Error searching users:', error)
    return apiError('Failed to search users', 500)
  }
}