import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return apiSuccess({ backlinks: [] })
    }

    const [incoming, outgoing] = await Promise.all([
      prisma.backlink.findMany({
        where: { targetType: type, targetId: id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.backlink.findMany({
        where: { sourceType: type, sourceId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const backlinks = [
      ...incoming.map(b => ({ ...b, direction: 'incoming' as const, createdAt: b.createdAt.toISOString() })),
      ...outgoing.map(b => ({ ...b, direction: 'outgoing' as const, createdAt: b.createdAt.toISOString() })),
    ]

    return apiSuccess({ backlinks })
  } catch (error) {
    console.error('Error fetching backlinks:', error)
    return apiSuccess({ backlinks: [] })
  }
}
