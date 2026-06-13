import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getTrendingHashtags } from '@/services/hashtagService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const mode = searchParams.get('mode') || 'trending'
    const limit = parseInt(searchParams.get('limit') || '20')
    const entity = searchParams.get('entity')

    if (search) {
      const hashtags = await prisma.hashtag.findMany({
        where: { tag: { contains: search.toLowerCase(), mode: 'insensitive' } },
        orderBy: { postCount: 'desc' },
        take: limit
      })
      const enriched = await enrichWithCounts(hashtags)
      return apiSuccess({ hashtags: enriched })
    }

    if (mode === 'trending') {
      const enriched = await getTrendingHashtags(7, limit, entity as any || undefined)
      if (entity) {
        return apiSuccess({ hashtags: enriched.filter((h: any) => (h.entities as any)[entity] > 0) })
      }
      return apiSuccess({ hashtags: enriched })
    }

    const hashtags = await prisma.hashtag.findMany({
      orderBy: { postCount: 'desc' },
      take: limit
    })
    const enriched = await enrichWithCounts(hashtags)
    return apiSuccess({ hashtags: enriched })
  } catch (error) {
    console.error('Error fetching hashtags:', error)
    return apiError("Failed to fetch hashtags", 500)
  }
}

async function enrichWithCounts(hashtags: { id: string; tag: string; postCount: number }[]) {
  return Promise.all(hashtags.map(async h => {
    const [posts, products, events, services, schoolContents, plans, requests, groups, forumPosts, groupPosts] = await Promise.all([
      prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'POST' } }),
      prisma.productHashtag.count({ where: { hashtagId: h.id } }),
      prisma.eventHashtag.count({ where: { hashtagId: h.id } }),
      prisma.serviceOfferingHashtag.count({ where: { hashtagId: h.id } }),
      prisma.schoolContentHashtag.count({ where: { hashtagId: h.id } }),
      prisma.projectHashtag.count({ where: { hashtagId: h.id } }),
      prisma.requestHashtag.count({ where: { hashtagId: h.id } }),
      prisma.groupHashtag.count({ where: { hashtagId: h.id } }),
      prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'FORUMPOST' } }),
      prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'GROUPPOST' } }),
    ])
    return {
      tag: h.tag,
      postCount: h.postCount,
      entities: { posts, products, events, services, schoolContents, plans, requests, groups, forumPosts, groupPosts }
    }
  }))
}
