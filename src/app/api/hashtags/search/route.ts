import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query || query.length < 1) {
    return apiSuccess({ hashtags: [] })
  }

  try {
    const hashtags = await prisma.hashtag.findMany({
      where: { tag: { contains: query.toLowerCase() } },
      orderBy: { postCount: 'desc' },
      take: 10,
      select: { tag: true, postCount: true }
    })

    return apiSuccess({ hashtags })
  } catch {
    return apiSuccess({ hashtags: [] })
  }
}
