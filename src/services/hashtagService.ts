import { prisma } from '@/lib/prisma'

const HASHTAG_REGEX = /#(\w{2,50})/g

export type HashtagEntityType =
  | 'POST'
  | 'FORUMPOST'
  | 'GROUPPOST'
  | 'PRODUCT'
  | 'EVENT'
  | 'SERVICE'
  | 'SCHOOLCONTENT'
  | 'PROJECT'
  | 'REQUEST'
  | 'GROUP'

const ENTITY_RELATIONS: Record<HashtagEntityType, { model: string; idField: string; table: string }> = {
  POST: { model: 'postHashtag', idField: 'postId', table: 'PostHashtag' },
  FORUMPOST: { model: 'postHashtag', idField: 'postId', table: 'PostHashtag' },
  GROUPPOST: { model: 'postHashtag', idField: 'postId', table: 'PostHashtag' },
  PRODUCT: { model: 'productHashtag', idField: 'productId', table: 'ProductHashtag' },
  EVENT: { model: 'eventHashtag', idField: 'eventId', table: 'EventHashtag' },
  SERVICE: { model: 'serviceOfferingHashtag', idField: 'serviceOfferingId', table: 'ServiceOfferingHashtag' },
  SCHOOLCONTENT: { model: 'schoolContentHashtag', idField: 'schoolContentId', table: 'SchoolContentHashtag' },
  PLAN: { model: 'projectHashtag', idField: 'projectId', table: 'ProjectHashtag' },
  REQUEST: { model: 'requestHashtag', idField: 'requestId', table: 'RequestHashtag' },
  GROUP: { model: 'groupHashtag', idField: 'groupId', table: 'GroupHashtag' },
}

export function extractHashtags(text: string): string[] {
  const tags: string[] = []
  const seen = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    const tag = match[1].toLowerCase()
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }
  return tags
}

export async function upsertHashtags(tags: string[]): Promise<Map<string, string>> {
  const idMap = new Map<string, string>()
  for (const tag of tags) {
    const h = await prisma.hashtag.upsert({
      where: { tag },
      create: { tag },
      update: {},
    })
    idMap.set(tag, h.id)
  }
  return idMap
}

export async function linkHashtags(entityType: HashtagEntityType, entityId: string, tags: string[]): Promise<void> {
  const rel = ENTITY_RELATIONS[entityType]
  if (!rel) return

  const tagIdMap = await upsertHashtags(tags)

  const deleteWhere: Record<string, string> = {}
  deleteWhere[rel.idField] = entityId
  await (prisma as any)[rel.model].deleteMany({ where: deleteWhere })

  for (const [, hashtagId] of tagIdMap) {
    const data: Record<string, any> = {
      [rel.idField]: entityId,
      hashtagId,
    }
    if (entityType === 'POST' || entityType === 'FORUMPOST' || entityType === 'GROUPPOST') {
      data.sourceType = entityType
    }
    if (['PRODUCT', 'SERVICE'].includes(entityType)) {
      data.sourceType = entityType
    }
    await (prisma as any)[rel.model].create({ data })
  }
}

export async function removeHashtags(entityType: HashtagEntityType, entityId: string): Promise<void> {
  const rel = ENTITY_RELATIONS[entityType]
  if (!rel) return
  const where: Record<string, string> = {}
  where[rel.idField] = entityId
  await (prisma as any)[rel.model].deleteMany({ where })
}

export async function extractAndLinkHashtags(
  text: string,
  entityType: HashtagEntityType,
  entityId: string,
): Promise<void> {
  const tags = extractHashtags(text)
  if (tags.length === 0) {
    await removeHashtags(entityType, entityId)
    return
  }
  await linkHashtags(entityType, entityId, tags)
}

export async function getHashtagsForEntity(
  entityType: HashtagEntityType,
  entityId: string,
): Promise<{ id: string; tag: string }[]> {
  const rel = ENTITY_RELATIONS[entityType]
  if (!rel) return []

  const where: Record<string, string> = {}
  where[rel.idField] = entityId

  const junctions = await (prisma as any)[rel.model].findMany({
    where,
    include: { hashtag: { select: { id: true, tag: true } } },
  })
  return junctions.map((j: any) => j.hashtag)
}

export async function getTrendingHashtags(
  days = 7,
  limit = 20,
  entityFilter?: HashtagEntityType,
): Promise<any[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  if (entityFilter) {
    const rel = ENTITY_RELATIONS[entityFilter]
    if (!rel) return []

    const recent = await (prisma as any)[rel.model].findMany({
      where: { createdAt: { gte: since } },
      select: { hashtagId: true },
    }) as { hashtagId: string }[]
    const ids = [...new Set(recent.map(r => r.hashtagId))]
    if (ids.length === 0) return []

    const hashtags = await prisma.hashtag.findMany({
      where: { id: { in: ids } },
      orderBy: { postCount: 'desc' },
      take: limit,
    })
    return enrichWithCounts(hashtags)
  }

  const idSet = new Set<string>()

  const allTables = Object.values(ENTITY_RELATIONS)
  for (const rel of allTables) {
    try {
      const items = await (prisma as any)[rel.model].findMany({
        where: { createdAt: { gte: since } },
        select: { hashtagId: true },
      })
      items.forEach((i: any) => idSet.add(i.hashtagId))
    } catch { }
  }

  if (idSet.size === 0) return []

  const hashtags = await prisma.hashtag.findMany({
    where: { id: { in: Array.from(idSet) } },
    orderBy: { postCount: 'desc' },
    take: limit,
  })

  return enrichWithCounts(hashtags)
}

async function enrichWithCounts(hashtags: { id: string; tag: string; postCount: number }[]) {
  return Promise.all(hashtags.map(async h => {
    const [posts, products, events, services, schoolContents, projects, requests, groups] = await Promise.all([
      prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'POST' } }),
      prisma.productHashtag.count({ where: { hashtagId: h.id } }),
      prisma.eventHashtag.count({ where: { hashtagId: h.id } }),
      prisma.serviceOfferingHashtag.count({ where: { hashtagId: h.id } }),
      prisma.schoolContentHashtag.count({ where: { hashtagId: h.id } }),
      prisma.projectHashtag.count({ where: { hashtagId: h.id } }),
      prisma.requestHashtag.count({ where: { hashtagId: h.id } }),
      prisma.groupHashtag.count({ where: { hashtagId: h.id } }),
    ])
    const forumPosts = await prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'FORUMPOST' } })
    const groupPosts = await prisma.postHashtag.count({ where: { hashtagId: h.id, sourceType: 'GROUPPOST' } })

    return {
      tag: h.tag,
      postCount: h.postCount,
      entities: {
        posts, products, events, services, schoolContents, projects, requests, groups,
        forumPosts, groupPosts,
      },
    }
  }))
}

export async function getHashtagTotals(tag: string) {
  const hashtag = await prisma.hashtag.findUnique({ where: { tag: tag.toLowerCase() } })
  if (!hashtag) {
    return {
      posts: 0, products: 0, events: 0, services: 0,
      schoolContents: 0, projects: 0, requests: 0, groups: 0,
      forumPosts: 0, groupPosts: 0,
    }
  }

  const [postCount, productCount, eventCount, serviceCount, schoolContentCount, projectCount, requestCount, groupCount, forumPostCount, groupPostCount] =
    await Promise.all([
      prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'POST' } }),
      prisma.productHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.eventHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.serviceOfferingHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.schoolContentHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.projectHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.requestHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.groupHashtag.count({ where: { hashtagId: hashtag.id } }),
      prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'FORUMPOST' } }),
      prisma.postHashtag.count({ where: { hashtagId: hashtag.id, sourceType: 'GROUPPOST' } }),
    ])

  return {
    posts: postCount, products: productCount, events: eventCount, services: serviceCount,
    schoolContents: schoolContentCount, projects: projectCount, requests: requestCount, groups: groupCount,
    forumPosts: forumPostCount, groupPosts: groupPostCount,
  }
}
