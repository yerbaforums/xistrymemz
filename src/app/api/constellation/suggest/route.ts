import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface Suggestion {
  type: 'SAME_GROUP' | 'NEARBY' | 'SHARED_INTEREST' | 'NETWORK_OVERLAP' | 'COLLABORATOR_MATCH'
  title: string
  description: string
  memberIds: string[]
  relevanceScore: number
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const userId = session.user.id

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        searchRadius: true,
        userClass: true,
        groupMemberships: { select: { groupId: true } },
      },
    })
    if (!me) return apiUnauthorized()

    const myGroupIds = me.groupMemberships.map(g => g.groupId)

    const myConnections = await prisma.connection.findMany({
      where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
      select: { requesterId: true, receiverId: true },
    })
    const myConnectedIds = new Set(myConnections.map(c => c.requesterId === userId ? c.receiverId : c.requesterId))

    const myPending = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
          { receiverId: userId, status: { in: ['PENDING', 'ACCEPTED'] } },
        ],
      },
      select: { requesterId: true, receiverId: true },
    })
    const notAvailableIds = new Set(myPending.map(c => c.requesterId === userId ? c.receiverId : c.requesterId))

    const candidates = await prisma.user.findMany({
      where: {
        id: { not: userId },
        NOT: { id: { in: [...notAvailableIds] } },
      },
      take: 50,
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        location: true,
        latitude: true,
        longitude: true,
        userClass: true,
        lookingForCollaborators: true,
        lastActiveAt: true,
        groupMemberships: { select: { groupId: true } },
        sentConnections: { where: { status: 'ACCEPTED' }, select: { receiverId: true } },
        receivedConnections: { where: { status: 'ACCEPTED' }, select: { requesterId: true } },
      },
    })

    const suggestions: Suggestion[] = []

    const sameGroupCandidates = candidates
      .filter(c => {
        const shared = c.groupMemberships.some(g => myGroupIds.includes(g.groupId))
        if (!shared) return false
        if (myConnectedIds.has(c.id)) return false
        return true
      })
      .map(c => {
        const sharedGroups = c.groupMemberships.filter(g => myGroupIds.includes(g.groupId)).length
        return {
          member: c,
          sharedGroups,
          score: 0.5 + sharedGroups * 0.15 + (c.lookingForCollaborators ? 0.1 : 0),
        }
      })
      .sort((a, b) => b.score - a.score)

    if (sameGroupCandidates.length >= 2) {
      const first = sameGroupCandidates[0]
      const second = sameGroupCandidates[1]
      suggestions.push({
        type: 'SAME_GROUP',
        title: `${sameGroupCandidates.length} members in your groups aren't connected to you yet`,
        description: `You each share ${first.sharedGroups} group${first.sharedGroups === 1 ? '' : 's'} together. Groups are great places to find collaborators.`,
        memberIds: sameGroupCandidates.slice(0, 4).map(s => s.member.id),
        relevanceScore: first.score,
      })
      if (second) {
        suggestions.push({
          type: 'SAME_GROUP',
          title: `${second.member.name} is in ${second.sharedGroups} of your groups`,
          description: second.member.location
            ? `Located in ${second.member.location}. Reach out and strengthen your network.`
            : 'Reach out and strengthen your network.',
          memberIds: [second.member.id],
          relevanceScore: second.score,
        })
      }
    }

    if (me.latitude && me.longitude) {
      const nearby = candidates
        .filter(c => c.latitude && c.longitude)
        .map(c => ({
          member: c,
          distance: haversineDistance(me.latitude!, me.longitude!, c.latitude!, c.longitude!),
        }))
        .filter(x => x.distance < (me.searchRadius || 50) && !myConnectedIds.has(x.member.id))
        .sort((a, b) => a.distance - b.distance)

      if (nearby.length >= 2) {
        suggestions.push({
          type: 'NEARBY',
          title: `${nearby.length} members are within ${Math.round(nearby[nearby.length - 1].distance)} miles of you`,
          description: 'Nearby members could become trade partners, event organizers, or collaborators.',
          memberIds: nearby.slice(0, 4).map(n => n.member.id),
          relevanceScore: 0.5,
        })
      }
    }

    const collabMatches = candidates
      .filter(c => c.lookingForCollaborators && !myConnectedIds.has(c.id))
      .slice(0, 4)

    if (collabMatches.length >= 2) {
      suggestions.push({
        type: 'COLLABORATOR_MATCH',
        title: `${collabMatches.length} members are seeking collaborators`,
        description: collabMatches[0].location
          ? `Including ${collabMatches[0].name} from ${collabMatches[0].location}.`
          : `Including ${collabMatches[0].name}.`,
        memberIds: collabMatches.map(c => c.id),
        relevanceScore: 0.6,
      })
    }

    const networkOverlap = candidates
      .map(c => {
        const cConnected = new Set([
          ...c.sentConnections.map(s => s.receiverId),
          ...c.receivedConnections.map(r => r.requesterId),
        ])
        const overlap = [...cConnected].filter(id => myConnectedIds.has(id) || myGroupIds.includes(id))
        return { member: c, overlapCount: overlap.length }
      })
      .filter(x => x.overlapCount >= 2)
      .sort((a, b) => b.overlapCount - a.overlapCount)
      .slice(0, 3)

    if (networkOverlap.length >= 2) {
      const top = networkOverlap[0]
      suggestions.push({
        type: 'NETWORK_OVERLAP',
        title: `${top.member.name} shares ${top.overlapCount} connections/groups with you`,
        description: 'Your networks overlap significantly, making this a high-relevance introduction.',
        memberIds: networkOverlap.map(n => n.member.id),
        relevanceScore: 0.85,
      })
    }

    const sorted = suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5)

    return apiSuccess({ suggestions: sorted })
  } catch (error) {
    console.error('GET /api/constellation/suggest:', error)
    return apiServerError(error)
  }
}