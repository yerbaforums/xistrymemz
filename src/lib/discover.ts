import { prisma } from '@/lib/prisma'

export interface DiscoverParams {
  q?: string
  type?: string
  lat?: number
  lng?: number
  radius?: number
  intent?: string
  hashtag?: string
  page?: number
  limit?: number
}

export interface DiscoverResult {
  id: string
  type: 'PRODUCT' | 'SERVICE' | 'GROUP' | 'EVENT' | 'PROJECT' | 'MEMBER'
  title: string
  description: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  distance: number | null
  price: number | null
  category: string | null
  lookingForCollaborators: boolean
  userId: string
  userName: string | null
  userImage: string | null
  hashtags: string[]
  createdAt: Date
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

function hasLocation(row: { latitude: number | null; longitude: number | null }): boolean {
  return row.latitude !== null && row.longitude !== null
}

export async function discover(params: DiscoverParams): Promise<{ results: DiscoverResult[]; total: number }> {
  const q = params.q?.trim() || ''
  const type = params.type || ''
  const lat = params.lat
  const lng = params.lng
  const radius = params.radius || 250
  const intent = params.intent || ''
  const hashtag = params.hashtag?.trim() || ''
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(50, Math.max(1, params.limit || 20))
  const offset = (page - 1) * limit

  const types = type ? [type] : ['PRODUCT', 'SERVICE', 'GROUP', 'EVENT', 'PROJECT', 'MEMBER']

  const queries: Promise<DiscoverResult[]>[] = []

  if (types.includes('PRODUCT')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = { published: true }
        if (q) {
          where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (intent === 'COLLABORATE') {
          where.acceptsOffers = true
        }
        if (hashtag) {
          const tag = await prisma.hashtag.findUnique({ where: { tag: hashtag.toLowerCase() } })
          if (tag) {
            where.hashtags = { some: { hashtagId: tag.id } }
          }
        }
        const rows = await prisma.product.findMany({
          where: where as any,
          select: {
            id: true, title: true, description: true, imageUrl: true,
            location: true, latitude: true, longitude: true, price: true,
            category: true, userId: true, createdAt: true,
            user: { select: { name: true, image: true } },
            hashtags: { select: { hashtag: { select: { tag: true } } } },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'PRODUCT' as const,
          title: r.title,
          description: r.description,
          image: r.imageUrl,
          location: r.location,
          latitude: r.latitude,
          longitude: r.longitude,
          distance: null,
          price: r.price,
          category: r.category,
          lookingForCollaborators: false,
          userId: r.userId,
          userName: r.user.name,
          userImage: r.user.image,
          hashtags: r.hashtags.map(h => h.hashtag.tag),
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  if (types.includes('SERVICE')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = { isActive: true }
        if (q) {
          where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (hashtag) {
          const tag = await prisma.hashtag.findUnique({ where: { tag: hashtag.toLowerCase() } })
          if (tag) {
            where.hashtags = { some: { hashtagId: tag.id } }
          }
        }
        const rows = await prisma.serviceOffering.findMany({
          where: where as any,
          select: {
            id: true, title: true, description: true, imageUrl: true,
            location: true, price: true, category: true, userId: true, createdAt: true,
            user: { select: { name: true, image: true } },
            hashtags: { select: { hashtag: { select: { tag: true } } } },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'SERVICE' as const,
          title: r.title,
          description: r.description,
          image: r.imageUrl,
          location: r.location,
          latitude: null,
          longitude: null,
          distance: null,
          price: r.price,
          category: r.category,
          lookingForCollaborators: false,
          userId: r.userId,
          userName: r.user.name,
          userImage: r.user.image,
          hashtags: r.hashtags.map(h => h.hashtag.tag),
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  if (types.includes('GROUP')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = {}
        if (q) {
          where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (hashtag) {
          const tag = await prisma.hashtag.findUnique({ where: { tag: hashtag.toLowerCase() } })
          if (tag) {
            where.hashtags = { some: { hashtagId: tag.id } }
          }
        }
        const rows = await prisma.group.findMany({
          where: where as any,
          select: {
            id: true, name: true, description: true, imageUrl: true,
            location: true, latitude: true, longitude: true, category: true,
            userId: true, createdAt: true,
            user: { select: { name: true, image: true } },
            hashtags: { select: { hashtag: { select: { tag: true } } } },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'GROUP' as const,
          title: r.name,
          description: r.description,
          image: r.imageUrl,
          location: r.location,
          latitude: r.latitude,
          longitude: r.longitude,
          distance: null,
          price: null,
          category: r.category,
          lookingForCollaborators: false,
          userId: r.userId,
          userName: r.user.name,
          userImage: r.user.image,
          hashtags: r.hashtags.map(h => h.hashtag.tag),
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  if (types.includes('EVENT')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = { eventDate: { gte: new Date() } }
        if (q) {
          where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (hashtag) {
          const tag = await prisma.hashtag.findUnique({ where: { tag: hashtag.toLowerCase() } })
          if (tag) {
            where.eventHashtags = { some: { hashtagId: tag.id } }
          }
        }
        const rows = await prisma.event.findMany({
          where: where as any,
          select: {
            id: true, title: true, description: true, imageUrl: true,
            location: true, latitude: true, longitude: true,
            eventCategory: true, organizerId: true, createdAt: true,
            organizer: { select: { name: true, image: true } },
            eventHashtags: { select: { hashtag: { select: { tag: true } } } },
          },
          take: limit,
          orderBy: { eventDate: 'asc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'EVENT' as const,
          title: r.title,
          description: r.description,
          image: r.imageUrl,
          location: r.location,
          latitude: r.latitude,
          longitude: r.longitude,
          distance: null,
          price: null,
          category: r.eventCategory,
          lookingForCollaborators: false,
          userId: r.organizerId,
          userName: r.organizer.name,
          userImage: r.organizer.image,
          hashtags: r.eventHashtags.map(h => h.hashtag.tag),
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  if (types.includes('PROJECT')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = { published: true }
        if (q) {
          where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (intent === 'COLLABORATE') {
          where.lookingForCollaborators = true
        }
        if (hashtag) {
          const tag = await prisma.hashtag.findUnique({ where: { tag: hashtag.toLowerCase() } })
          if (tag) {
            where.hashtags = { some: { hashtagId: tag.id } }
          }
        }
        const rows = await prisma.project.findMany({
          where: where as any,
          select: {
            id: true, title: true, description: true, imageUrl: true,
            location: true, latitude: true, longitude: true, category: true,
            lookingForCollaborators: true, userId: true, createdAt: true,
            user: { select: { name: true, image: true } },
            hashtags: { select: { hashtag: { select: { tag: true } } } },
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'PROJECT' as const,
          title: r.title,
          description: r.description,
          image: r.imageUrl,
          location: r.location,
          latitude: r.latitude,
          longitude: r.longitude,
          distance: null,
          price: null,
          category: r.category,
          lookingForCollaborators: r.lookingForCollaborators,
          userId: r.userId,
          userName: r.user.name,
          userImage: r.user.image,
          hashtags: r.hashtags.map(h => h.hashtag.tag),
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  if (types.includes('MEMBER')) {
    queries.push(
      (async () => {
        const where: Record<string, unknown> = {}
        if (q) {
          where.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { bio: { contains: q, mode: 'insensitive' } },
          ]
        }
        if (intent === 'COLLABORATE') {
          where.lookingForCollaborators = true
        }
        const rows = await prisma.user.findMany({
          where: where as any,
          select: {
            id: true, name: true, bio: true, image: true,
            location: true, latitude: true, longitude: true,
            userClass: true, lookingForCollaborators: true, createdAt: true,
          },
          take: limit,
          orderBy: { createdAt: 'desc' },
        })
        return rows.map(r => ({
          id: r.id,
          type: 'MEMBER' as const,
          title: r.name || 'Unknown',
          description: r.bio,
          image: r.image,
          location: r.location,
          latitude: r.latitude,
          longitude: r.longitude,
          distance: null,
          price: null,
          category: r.userClass,
          lookingForCollaborators: r.lookingForCollaborators,
          userId: r.id,
          userName: r.name,
          userImage: r.image,
          hashtags: [],
          createdAt: r.createdAt,
        }))
      })()
    )
  }

  const results = (await Promise.all(queries)).flat()

  if (lat !== undefined && lng !== undefined) {
    const refLat = Number(lat)
    const refLng = Number(lng)
    for (const r of results) {
      if (hasLocation(r)) {
        r.distance = Math.round(haversineDistance(refLat, refLng, r.latitude!, r.longitude!) * 10) / 10
      }
    }
    const filtered = results.filter(r => r.distance === null || r.distance <= radius)
    filtered.sort((a, b) => {
      const dA = a.distance ?? Infinity
      const dB = b.distance ?? Infinity
      return dA - dB
    })
    const total = filtered.length
    return { results: filtered.slice(offset, offset + limit), total }
  }

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const total = results.length
  return { results: results.slice(offset, offset + limit), total }
}
