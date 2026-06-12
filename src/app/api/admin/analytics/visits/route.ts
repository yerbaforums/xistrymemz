import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as { role?: string }).role !== 'ADMIN') {
      return apiError("Unauthorized", 403)
    }

    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')))
    const ipFilter = url.searchParams.get('ip') || null
    const pageFilter = url.searchParams.get('pagePath') || null
    const countryFilter = url.searchParams.get('country') || null

    const where: Record<string, any> = {}
    if (ipFilter) where.ipHash = { contains: ipFilter, mode: 'insensitive' }
    if (pageFilter) where.landingPage = { contains: pageFilter, mode: 'insensitive' }
    if (countryFilter) where.country = { contains: countryFilter, mode: 'insensitive' }

    const [total, visits] = await Promise.all([
      prisma.pageVisit.count({ where }),
      prisma.pageVisit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          ipHash: true,
          country: true,
          city: true,
          region: true,
          latitude: true,
          longitude: true,
          landingPage: true,
          referrer: true,
          referrerDomain: true,
          referrerType: true,
          userAgent: true,
          createdAt: true,
          userId: true,
          user: { select: { id: true, name: true, username: true, image: true } },
        },
      }),
    ])

    return NextResponse.json({
      visits: visits.map(v => ({
        ...v,
        createdAt: v.createdAt.toISOString(),
        user: v.user
          ? { id: v.user.id, name: v.user.name, username: v.user.username, image: v.user.image }
          : null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching visits:', error)
    return apiError("Failed to fetch visits", 500)
  }
}
