import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')
    if (!requestId) return apiError('requestId is required')

    const req = await prisma.request.findUnique({
      where: { id: requestId },
      select: { category: true, latitude: true, longitude: true, allowFulfillments: true, status: true },
    })
    if (!req) return apiError('Request not found', 404)
    if (!req.allowFulfillments) return apiSuccess([])

    const category = req.category

    const [services, products] = await Promise.all([
      prisma.serviceOffering.findMany({
        where: { isActive: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: { published: true },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    interface MatchItem {
      type: 'PRODUCT' | 'SERVICE'
      id: string
      title: string
      imageUrl: string | null
      price: number | null
      ratingAvg: number | null
      ratingCount: number
      distanceKm: number | null
      categoryScore: number
    }

    const results: MatchItem[] = []

    for (const svc of services) {
      const catMatch = svc.category === category ? 2 : 1
      const dist =
        req.latitude && req.longitude && svc.latitude && svc.longitude
          ? haversineDistance(req.latitude, req.longitude, svc.latitude, svc.longitude)
          : null
      const distScore = dist !== null ? Math.max(0, 100 - dist) : 50
      const productRatings = await prisma.rating.aggregate({
        where: { productId: null, userId: svc.userId },
        _avg: { rating: true },
        _count: { rating: true },
      })
      results.push({
        type: 'SERVICE',
        id: svc.id,
        title: svc.title,
        imageUrl: svc.imageUrl,
        price: svc.price,
        ratingAvg: productRatings._avg.rating,
        ratingCount: productRatings._count.rating,
        distanceKm: dist,
        categoryScore: catMatch * distScore,
      })
    }

    for (const prod of products) {
      const catMatch = prod.category === category ? 2 : 1
      const dist =
        req.latitude && req.longitude && prod.latitude && prod.longitude
          ? haversineDistance(req.latitude, req.longitude, prod.latitude, prod.longitude)
          : null
      const distScore = dist !== null ? Math.max(0, 100 - dist) : 50
      const prodRatings = await prisma.rating.aggregate({
        where: { productId: prod.id },
        _avg: { rating: true },
        _count: { rating: true },
      })
      results.push({
        type: 'PRODUCT',
        id: prod.id,
        title: prod.title,
        imageUrl: prod.imageUrl,
        price: prod.price,
        ratingAvg: prodRatings._avg.rating,
        ratingCount: prodRatings._count.rating,
        distanceKm: dist,
        categoryScore: catMatch * distScore,
      })
    }

    results.sort((a, b) => b.categoryScore - a.categoryScore)
    return apiSuccess(results.slice(0, 5))
  } catch (error) {
    return apiServerError(error)
  }
}
