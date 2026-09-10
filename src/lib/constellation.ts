import { prisma } from '@/lib/prisma'

export const EDGE_COLORS = {
  GROUP: '#22c55e',
  INTEREST: '#00d9ff',
  CONNECTION: '#8b5cf6',
  LOCATION: '#f59e0b',
} as const

export type EdgeType = keyof typeof EDGE_COLORS

export interface ConstellationStar {
  id: string
  type: 'MEMBER'
  title: string
  subtitle?: string
  image?: string
  username?: string
  userClass?: string
  role?: string
  location?: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
  emoji: string
  active: boolean
  lookingForCollaborators: boolean
  groupIds: string[]
  sharedInterestCount: number
  connectionStrength: number
  reputationScore: number
  lastActiveAt: string | null
  entityCounts?: {
    projects: number
    products: number
    events: number
    requests: number
    groups: number
    posts: number
  }
}

export interface ConstellationEdge {
  from: string
  to: string
  type: EdgeType
  strength: number
}

export interface ConstellationCluster {
  id: string
  type: 'GROUP' | 'LOCATION'
  label: string
  centerX: number
  centerY: number
  memberCount: number
  description?: string
  isJoined?: boolean
}

export interface ConstellationData {
  stars: ConstellationStar[]
  edges: ConstellationEdge[]
  clusters: ConstellationCluster[]
  currentUser: {
    id: string
    connectedIds: string[]
    groupIds: string[]
  } | null
}

export interface ConstellationParams {
  userId?: string
  limit?: number
  radius?: number
}

const MAX_STARS = 120
const MAX_EDGES = 300

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

function getRadius(reputation: number, active: boolean, lookingForCollaborators: boolean): number {
  const base = 4 + Math.min(8, Math.floor(reputation / 15))
  const activeBoost = active ? 2 : 0
  const collabBoost = lookingForCollaborators ? 1.5 : 0
  return Math.max(4, Math.min(16, base + activeBoost + collabBoost))
}

function getAlpha(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 0.45
  const hours = (Date.now() - new Date(lastActiveAt).getTime()) / 3600000
  if (hours < 1) return 1
  if (hours < 24) return 0.8
  if (hours < 168) return 0.6
  return 0.45
}

function runForceSimulation(
  stars: ConstellationStar[],
  edges: ConstellationEdge[],
  clusters: ConstellationCluster[],
  width: number,
  height: number,
): void {
  const damping = 0.85
  const repulsion = 140000
  const spring = 0.04
  const clusterGravity = 0.012
  const minDist = 34

  for (let iter = 0; iter < 60; iter++) {
    for (const star of stars) {
      let fx = 0
      let fy = 0

      for (const other of stars) {
        if (other === star) continue
        const dx = star.x - other.x
        const dy = star.y - other.y
        const distSq = Math.max(dx * dx + dy * dy, 100)
        const dist = Math.sqrt(distSq)
        if (dist < minDist) {
          const push = (minDist - dist) * 0.5
          fx += (dx / dist) * push
          fy += (dy / dist) * push
        }
        const rep = repulsion / distSq
        fx += (dx / dist) * rep
        fy += (dy / dist) * rep
      }

      for (const edge of edges) {
        if (edge.from !== star.id && edge.to !== star.id) continue
        const other = stars.find(s => s.id === (edge.from === star.id ? edge.to : edge.from))
        if (!other) continue
        const dx = other.x - star.x
        const dy = other.y - star.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const pull = spring * edge.strength * (dist - 90)
        fx += (dx / dist) * pull
        fy += (dy / dist) * pull
      }

      for (const cluster of clusters) {
        const dx = cluster.centerX - star.x
        const dy = cluster.centerY - star.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        fx += (dx / dist) * clusterGravity * cluster.memberCount
        fy += (dy / dist) * clusterGravity * cluster.memberCount
      }

      star.vx = star.vx * damping + fx * 0.02
      star.vy = star.vy * damping + fy * 0.02
      star.x += star.vx
      star.y += star.vy

      star.x = Math.max(40, Math.min(width - 40, star.x))
      star.y = Math.max(40, Math.min(height - 40, star.y))
    }
  }
}

export async function getConstellationData(params: ConstellationParams = {}): Promise<ConstellationData> {
  const { userId, limit = MAX_STARS, radius = 250 } = params

  const currentUser = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          latitude: true,
          longitude: true,
        },
      })
    : null

  const where: Record<string, unknown> = {}
  if (currentUser?.latitude && currentUser?.longitude) {
    where.latitude = { not: null }
  }

  const memberRows = await prisma.user.findMany({
    where: { ...where, id: { not: userId } },
    take: limit,
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      location: true,
      latitude: true,
      longitude: true,
      userClass: true,
      role: true,
      reputationScore: true,
      lookingForCollaborators: true,
      lastActiveAt: true,
      createdAt: true,
      groupMemberships: { select: { groupId: true, group: { select: { name: true, description: true, isPrivate: true } } } },
      sentConnections: { select: { receiverId: true, status: true } },
      receivedConnections: { select: { requesterId: true, status: true } },
      _count: {
        select: {
          projects: true,
          organizedEvents: true,
          requests: true,
          posts: true,
          products: true,
        },
      },
    },
  })

  const memberIds = memberRows.map(m => m.id)

  let connectedPairs: Array<{ from: string; to: string }> = []
  if (userId) {
    const myConnections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      select: { requesterId: true, receiverId: true },
    })
    connectedPairs = myConnections
      .filter(c => memberIds.includes(c.requesterId) && memberIds.includes(c.receiverId))
      .map(c => ({
        from: c.requesterId === userId ? c.receiverId : c.requesterId,
        to: c.requesterId === userId ? c.requesterId : c.receiverId,
      }))
  }

  const acceptedPairs = new Set<string>()
  for (const m of memberRows) {
    for (const c of m.sentConnections) {
      if (c.status === 'ACCEPTED' && memberIds.includes(c.receiverId)) {
        acceptedPairs.add(`${m.id}:${c.receiverId}`)
      }
    }
    for (const c of m.receivedConnections) {
      if (c.status === 'ACCEPTED' && memberIds.includes(c.requesterId)) {
        acceptedPairs.add(`${c.requesterId}:${m.id}`)
      }
    }
  }

  const width = 1600
  const height = 1000
  const clusterMap = new Map<string, ConstellationCluster>()
  const memberGroupMap = new Map<string, string[]>()

  for (const m of memberRows) {
    memberGroupMap.set(m.id, m.groupMemberships.map(g => g.groupId))
    for (const gm of m.groupMemberships) {
      if (gm.group.isPrivate) continue
      const key = `g:${gm.groupId}`
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          id: gm.groupId,
          type: 'GROUP',
          label: gm.group.name,
          description: gm.group.description || undefined,
          centerX: Math.random() * width,
          centerY: Math.random() * height,
          memberCount: 0,
        })
      }
      const cluster = clusterMap.get(key)!
      cluster.memberCount++
    }
  }

  if (currentUser?.latitude && currentUser?.longitude) {
    for (const m of memberRows) {
      if (!m.latitude || !m.longitude) continue
      const dist = haversineDistance(currentUser.latitude, currentUser.longitude, m.latitude, m.longitude)
      if (dist > radius) continue
      const key = `l:${m.location ?? 'nearby'}`
      if (!clusterMap.has(key)) {
        clusterMap.set(key, {
          id: `loc-${m.location ?? 'nearby'}`,
          type: 'LOCATION',
          label: m.location || 'Nearby',
          centerX: Math.random() * width,
          centerY: Math.random() * height,
          memberCount: 0,
        })
      }
      const cluster = clusterMap.get(key)!
      cluster.memberCount++
    }
  }

  const stars: ConstellationStar[] = memberRows.map((m) => {
    const active = m.lastActiveAt ? Date.now() - new Date(m.lastActiveAt).getTime() < 3600000 : false
    const memberships = m.groupMemberships.length
    const isConnectedToMe = userId ? connectedPairs.some(p => p.from === m.id || p.to === m.id) : false
    const strength = isConnectedToMe ? 1 : memberships > 0 ? 0.6 : 0.3

    return {
      id: m.id,
      type: 'MEMBER',
      title: m.name || m.username || 'Anonymous',
      subtitle: m.userClass ? m.userClass.split(',')[0] : undefined,
      image: m.image || undefined,
      username: m.username || undefined,
      userClass: m.userClass || undefined,
      role: m.role,
      location: m.location || undefined,
      x: 120 + Math.random() * (width - 240),
      y: 120 + Math.random() * (height - 240),
      vx: 0,
      vy: 0,
      radius: getRadius(m.reputationScore || 0, active, m.lookingForCollaborators),
      alpha: getAlpha(m.lastActiveAt ? m.lastActiveAt.toISOString() : null),
      color: '#00d9ff',
      emoji: '👤',
      active,
      lookingForCollaborators: m.lookingForCollaborators,
      groupIds: m.groupMemberships.map(g => g.groupId),
      sharedInterestCount: 0,
      connectionStrength: strength,
      reputationScore: m.reputationScore || 0,
      lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
      entityCounts: {
        projects: m._count.projects,
        products: m._count.products,
        events: m._count.organizedEvents,
        requests: m._count.requests,
        groups: memberships,
        posts: m._count.posts,
      },
    }
  })

  const edges: ConstellationEdge[] = []

  for (let i = 0; i < memberRows.length; i++) {
    for (let j = i + 1; j < memberRows.length; j++) {
      const a = memberRows[i]
      const b = memberRows[j]

      const sharedGroups = a.groupMemberships.filter(g =>
        memberRows[j].groupMemberships.some(g2 => g2.groupId === g.groupId)
      )
      const isConnected = acceptedPairs.has(`${a.id}:${b.id}`) || acceptedPairs.has(`${b.id}:${a.id}`)

      let nearLocation = false
      if (a.latitude && a.longitude && b.latitude && b.longitude) {
        const dist = haversineDistance(a.latitude, a.longitude, b.latitude, b.longitude)
        nearLocation = dist < 50
      }

      if (sharedGroups.length > 0) {
        edges.push({
          from: a.id,
          to: b.id,
          type: 'GROUP',
          strength: Math.min(0.8, sharedGroups.length * 0.35),
        })
      }
      if (isConnected) {
        edges.push({
          from: a.id,
          to: b.id,
          type: 'CONNECTION',
          strength: 1,
        })
      }
      if (nearLocation) {
        edges.push({
          from: a.id,
          to: b.id,
          type: 'LOCATION',
          strength: 0.4,
        })
      }
    }
  }

  const sortedEdges = edges.sort((a, b) => b.strength - a.strength).slice(0, MAX_EDGES)

  const clusters: ConstellationCluster[] = []
  for (const cluster of clusterMap.values()) {
    if (cluster.memberCount < 2) continue
    const memberIdsInCluster = memberRows
      .filter(m => {
        if (cluster.type === 'GROUP') return memberGroupMap.get(m.id)?.includes(cluster.id)
        return (m.location || 'nearby') === cluster.label
      })
      .map(m => m.id)
    if (memberIdsInCluster.length === 0) continue
    const avgX = stars.filter(s => memberIdsInCluster.includes(s.id)).reduce((sum, s) => sum + s.x, 0) / memberIdsInCluster.length
    const avgY = stars.filter(s => memberIdsInCluster.includes(s.id)).reduce((sum, s) => sum + s.y, 0) / memberIdsInCluster.length
    clusters.push({
      ...cluster,
      centerX: avgX,
      centerY: avgY,
      isJoined: userId ? memberGroupMap.get(userId)?.includes(cluster.id) : cluster.type === 'LOCATION',
    })
  }

  runForceSimulation(stars, sortedEdges, clusters, width, height)

  for (const cluster of clusters) {
    const ids = stars.filter(s => {
      if (cluster.type === 'GROUP') return s.groupIds.includes(cluster.id)
      return (s.location || 'nearby') === cluster.label
    }).map(s => s.id)
    if (ids.length < 2) continue
    cluster.centerX = stars.filter(s => ids.includes(s.id)).reduce((sum, s) => sum + s.x, 0) / ids.length
    cluster.centerY = stars.filter(s => ids.includes(s.id)).reduce((sum, s) => sum + s.y, 0) / ids.length
  }

  const connectedIds = userId
    ? (
        await prisma.connection.findMany({
          where: {
            status: 'ACCEPTED',
            OR: [{ requesterId: userId }, { receiverId: userId }],
          },
          select: { requesterId: true, receiverId: true },
        })
      ).map(c => (c.requesterId === userId ? c.receiverId : c.requesterId))
    : []

  const groupIds = userId
    ? (await prisma.groupMember.findMany({ where: { userId }, select: { groupId: true } })).map(g => g.groupId)
    : []

  return {
    stars,
    edges: sortedEdges,
    clusters,
    currentUser: userId ? { id: userId, connectedIds, groupIds } : null,
  }
}