import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface UserAsset {
  id: string
  type: 'PRODUCT' | 'SERVICE' | 'EVENT' | 'GROUP' | 'PLAN' | 'REQUEST' | 'SCHOOL_CONTENT' | 'POST' | 'SHOP' | 'USER'
  title: string
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

function firstImage(images: string | null, imageUrl: string | null): string | null {
  if (imageUrl) return imageUrl
  if (images) {
    try {
      const arr = JSON.parse(images)
      if (Array.isArray(arr) && arr.length > 0) return arr[0]
    } catch {}
  }
  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const userId = session.user.id

  try {
    const [
      products, events, groups, plans,
      requests, services, schoolContents, posts, user,
    ] = await Promise.all([
      prisma.product.findMany({
        where: { userId, published: true },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.group.findMany({
        where: { userId },
        select: { id: true, name: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.plan.findMany({
        where: { userId, published: true },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.request.findMany({
        where: { userId, isPublic: true },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.serviceOffering.findMany({
        where: { userId, isActive: true },
        select: { id: true, title: true, imageUrl: true, location: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.schoolContent.findMany({
        where: { userId },
        select: { id: true, title: true, images: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.post.findMany({
        where: { userId },
        select: { id: true, content: true, imageUrl: true, images: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, location: true, latitude: true, longitude: true, shopName: true, shopImage: true, shopSlug: true },
      }),
    ])

    const assets: UserAsset[] = [
      ...products.map(p => ({ id: p.id, type: 'PRODUCT' as const, title: p.title, image: p.imageUrl, location: p.location, latitude: p.latitude, longitude: p.longitude })),
      ...events.map(e => ({ id: e.id, type: 'EVENT' as const, title: e.title, image: e.imageUrl, location: e.location, latitude: e.latitude, longitude: e.longitude })),
      ...groups.map(g => ({ id: g.id, type: 'GROUP' as const, title: g.name, image: g.imageUrl, location: g.location, latitude: g.latitude, longitude: g.longitude })),
      ...plans.map(p => ({ id: p.id, type: 'PLAN' as const, title: p.title, image: p.imageUrl, location: p.location, latitude: p.latitude, longitude: p.longitude })),
      ...requests.map(r => ({ id: r.id, type: 'REQUEST' as const, title: r.title, image: r.imageUrl, location: r.location, latitude: r.latitude, longitude: r.longitude })),
      ...services.map(s => ({ id: s.id, type: 'SERVICE' as const, title: s.title, image: s.imageUrl, location: s.location, latitude: null, longitude: null })),
      ...schoolContents.map(sc => ({ id: sc.id, type: 'SCHOOL_CONTENT' as const, title: sc.title, image: firstImage(sc.images, null), location: null, latitude: null, longitude: null })),
      ...posts.map(p => ({ id: p.id, type: 'POST' as const, title: p.content.slice(0, 80), image: firstImage(p.images, p.imageUrl), location: null, latitude: null, longitude: null })),
    ]

    if (user?.shopName || user?.shopSlug) {
      assets.push({
        id: 'my-shop',
        type: 'SHOP',
        title: user.shopName || user.shopSlug || 'My Shop',
        image: user.shopImage || null,
        location: user.location || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
      })
    }

    if (user?.name) {
      assets.push({
        id: userId,
        type: 'USER',
        title: user.name,
        image: user.image || null,
        location: user.location || null,
        latitude: user.latitude || null,
        longitude: user.longitude || null,
      })
    }

    return apiSuccess({ assets })
  } catch (error) {
    console.error('GET /api/user/assets:', error)
    return apiError("Internal server error", 500)
  }
}
