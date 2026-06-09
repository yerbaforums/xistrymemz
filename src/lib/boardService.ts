import { prisma } from '@/lib/prisma'
import type { BulletinBoard, BulletinPin } from '@prisma/client'

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

export interface BoardWithDistance extends BulletinBoard {
  distance: number | null
  pinCount: number
}

export async function findNearbyBoards(params: {
  lat?: number
  lng?: number
  radius?: number
  city?: string
  q?: string
  page?: number
  limit?: number
  north?: number
  south?: number
  east?: number
  west?: number
}): Promise<{ boards: BoardWithDistance[]; total: number }> {
  const { lat, lng, radius = 50, city, q, page = 1, limit = 20, north, south, east, west } = params
  const offset = (page - 1) * limit

  let where: Record<string, unknown> = { isPublic: true }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' }
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (north !== undefined && south !== undefined && east !== undefined && west !== undefined) {
    where.latitude = { gte: south, lte: north }
    where.longitude = { gte: west, lte: east }
  }

  if (lat !== undefined && lng !== undefined) {
    const rows = await prisma.bulletinBoard.findMany({
      where: where as any,
      include: { _count: { select: { pins: { where: { expiresAt: { gte: new Date() } } } } } },
      orderBy: { createdAt: 'desc' },
    })

    let boards: BoardWithDistance[] = rows.map(r => ({
      ...r,
      distance: null,
      pinCount: r._count.pins,
    }))

    for (const b of boards) {
      if (b.latitude !== null && b.longitude !== null) {
        b.distance = Math.round(haversineDistance(lat, lng, b.latitude, b.longitude) * 10) / 10
      }
    }
    boards = boards.filter(b => b.distance === null || b.distance <= radius)
    const total = boards.length
    boards.sort((a, b) => {
      const dA = a.distance ?? Infinity
      const dB = b.distance ?? Infinity
      return dA - dB
    })

    return { boards: boards.slice(offset, offset + limit), total }
  }

  const [rows, total] = await Promise.all([
    prisma.bulletinBoard.findMany({
      where: where as any,
      include: { _count: { select: { pins: { where: { expiresAt: { gte: new Date() } } } } } },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.bulletinBoard.count({ where: where as any }),
  ])

  const boards: BoardWithDistance[] = rows.map(r => ({
    ...r,
    distance: null,
    pinCount: r._count.pins,
  }))

  return { boards, total }
}

export async function getBoardBySlug(slug: string) {
  const board = await prisma.bulletinBoard.findUnique({
    where: { slug },
  })
  return board
}

export async function autoCreateBoard(params: {
  name?: string
  location: string
  latitude: number
  longitude: number
  city?: string
  region?: string
  country?: string
  ownerId?: string
}): Promise<BulletinBoard> {
  const citySlug = (params.city || params.location).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  let slug = citySlug
  let counter = 1
  while (await prisma.bulletinBoard.findUnique({ where: { slug } })) {
    slug = `${citySlug}-${counter}`
    counter++
  }

  return prisma.bulletinBoard.create({
    data: {
      name: params.name || `${params.city || params.location} Board`,
      slug,
      location: params.location,
      latitude: params.latitude,
      longitude: params.longitude,
      city: params.city || null,
      region: params.region || null,
      country: params.country || null,
      isSystem: true,
      ownerId: params.ownerId || null,
    },
  })
}

export async function ensureBoardNearby(params: {
  latitude: number
  longitude: number
  location?: string
  city?: string
  region?: string
  country?: string
  ownerId?: string
}): Promise<BulletinBoard> {
  const nearby = await findNearbyBoards({
    lat: params.latitude,
    lng: params.longitude,
    radius: 25,
    limit: 1,
  })

  if (nearby.boards.length > 0) {
    return nearby.boards[0]
  }

  return autoCreateBoard({
    location: params.location || `${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}`,
    latitude: params.latitude,
    longitude: params.longitude,
    city: params.city,
    region: params.region,
    country: params.country,
    ownerId: params.ownerId,
  })
}

export async function createPin(params: {
  boardId: string
  userId: string
  title?: string
  content: string
  images?: string[]
  entityType?: string
  entityId?: string
  entityTitle?: string
  entityImage?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  category?: string
  expiresAt?: string
  latitude?: number
  longitude?: number
}) {
  const pin = await prisma.bulletinPin.create({
    data: {
      boardId: params.boardId,
      userId: params.userId,
      title: params.title || null,
      content: params.content,
      images: params.images?.length ? JSON.stringify(params.images) : null,
      entityType: params.entityType || null,
      entityId: params.entityId || null,
      entityTitle: params.entityTitle || null,
      entityImage: params.entityImage || null,
      contactName: params.contactName || null,
      contactEmail: params.contactEmail || null,
      contactPhone: params.contactPhone || null,
      category: params.category || 'GENERAL',
      expiresAt: params.expiresAt ? new Date(params.expiresAt) : null,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  await prisma.bulletinBoard.update({
    where: { id: params.boardId },
    data: { pinCount: { increment: 1 } },
  })

  return pin
}

export async function getPins(params: {
  boardId: string
  includeExpired?: boolean
  page?: number
  limit?: number
}) {
  const { boardId, includeExpired = false, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit

  const where: Record<string, unknown> = { boardId }
  if (!includeExpired) {
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gte: new Date() } },
    ]
  }

  const [pins, total] = await Promise.all([
    prisma.bulletinPin.findMany({
      where: where as any,
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { pinOrder: 'asc' }, { createdAt: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.bulletinPin.count({ where: where as any }),
  ])

  const mapped = pins.map(pin => ({
    ...pin,
    likeCount: pin._count.likes,
    commentCount: pin._count.comments,
  }))

  return { pins: mapped, total }
}
