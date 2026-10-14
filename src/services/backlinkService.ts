import { prisma } from '@/lib/prisma'
import type { Backlink } from '@prisma/client'

export type EntityType =
  | 'PROJECT' | 'PRODUCT' | 'POST' | 'EVENT' | 'SCHOOLCONTENT'
  | 'REQUEST' | 'SERVICE' | 'GROUP' | 'SHOP' | 'SCHOOL' | 'BOARD'
  | 'FORUMPOST' | 'BLOG' | 'PODCAST' | 'USER'

export type RelationType = 'REFERENCES' | 'CONTAINS' | 'RELATES_TO' | 'PROMOTES'

interface BacklinkInput {
  sourceType: EntityType
  sourceId: string
  targetType: EntityType
  targetId: string
  relationType?: RelationType
}

export async function createBacklink(input: BacklinkInput): Promise<void> {
  await prisma.backlink.upsert({
    where: {
      sourceType_sourceId_targetType_targetId: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    },
    create: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      targetType: input.targetType,
      targetId: input.targetId,
      relationType: input.relationType || 'REFERENCES',
    },
    update: {},
  })
}

export async function removeBacklinks(
  sourceType: EntityType,
  sourceId: string,
): Promise<void> {
  await prisma.backlink.deleteMany({
    where: { sourceType, sourceId },
  })
}

export async function removeBacklink(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
): Promise<void> {
  await prisma.backlink.deleteMany({
    where: { sourceType, sourceId, targetType, targetId },
  })
}

export async function getIncomingBacklinks(
  targetType: EntityType,
  targetId: string,
): Promise<Backlink[]> {
  return prisma.backlink.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOutgoingBacklinks(
  sourceType: EntityType,
  sourceId: string,
): Promise<Backlink[]> {
  return prisma.backlink.findMany({
    where: { sourceType, sourceId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRelatedItems(
  entityType: EntityType,
  entityId: string,
): Promise<{ incoming: Backlink[]; outgoing: Backlink[] }> {
  const [incoming, outgoing] = await Promise.all([
    getIncomingBacklinks(entityType, entityId),
    getOutgoingBacklinks(entityType, entityId),
  ])
  return { incoming, outgoing }
}

export async function createBacklinkOnPost(
  postId: string,
  referenceType: string,
  referenceId: string,
): Promise<void> {
  if (!referenceType || !referenceId) return
  await createBacklink({
    sourceType: 'POST',
    sourceId: postId,
    targetType: referenceType as EntityType,
    targetId: referenceId,
    relationType: 'REFERENCES',
  })
}

export async function getRelatedEntitiesData(
  entityType: EntityType,
  entityId: string,
): Promise<{ type: string; id: string; title: string; url: string }[]> {
  const { incoming, outgoing } = await getRelatedItems(entityType, entityId)
  const results: { type: string; id: string; title: string; url: string }[] = []

  const allLinks = [
    ...incoming.map(b => ({ type: b.sourceType, id: b.sourceId, dir: 'in' as const })),
    ...outgoing.map(b => ({ type: b.targetType, id: b.targetId, dir: 'out' as const })),
  ]

  const unique = allLinks.filter(
    (link, i) => allLinks.findIndex(l => l.type === link.type && l.id === link.id) === i,
  )

  for (const link of unique.slice(0, 10)) {
    try {
      const entity = await resolveEntity(link.type as EntityType, link.id)
      if (entity) {
        results.push({
          type: link.type,
          id: link.id,
          title: entity.title,
          url: entity.url,
        })
      }
    } catch { }
  }

  return results
}

/**
 * Resolve a linked entity to a display title and a working URL. Slug-based
 * entities (boards, shops, schools, blogs, podcasts, member profiles) are
 * resolved through their slug routes so links never 404.
 */
async function resolveEntity(
  type: EntityType,
  id: string,
): Promise<{ title: string; url: string } | null> {
  switch (type) {
    case 'PROJECT': {
      const p = await prisma.project.findUnique({ where: { id }, select: { title: true } })
      return p?.title ? { title: p.title, url: `/projects/${id}` } : null
    }
    case 'PRODUCT': {
      const p = await prisma.product.findUnique({ where: { id }, select: { title: true } })
      return p?.title ? { title: p.title, url: `/products/${id}` } : null
    }
    case 'EVENT': {
      const e = await prisma.event.findUnique({ where: { id }, select: { title: true } })
      return e?.title ? { title: e.title, url: `/events/${id}` } : null
    }
    case 'REQUEST': {
      const r = await prisma.request.findUnique({ where: { id }, select: { title: true } })
      return r?.title ? { title: r.title, url: `/requests/${id}` } : null
    }
    case 'SCHOOLCONTENT': {
      const s = await prisma.schoolContent.findUnique({ where: { id }, select: { title: true } })
      return s?.title ? { title: s.title, url: `/school/content/${id}` } : null
    }
    case 'SERVICE': {
      const s = await prisma.serviceOffering.findUnique({ where: { id }, select: { title: true } })
      return s?.title ? { title: s.title, url: `/services/${id}` } : null
    }
    case 'GROUP': {
      const g = await prisma.group.findUnique({ where: { id }, select: { name: true } })
      return g?.name ? { title: g.name, url: `/groups/${id}` } : null
    }
    case 'POST': {
      const p = await prisma.post.findUnique({ where: { id }, select: { content: true } })
      return p?.content ? { title: p.content.slice(0, 80), url: `/posts/${id}` } : null
    }
    case 'FORUMPOST': {
      const fp = await prisma.forumPost.findUnique({ where: { id }, select: { title: true } })
      return fp?.title ? { title: fp.title, url: `/community/forum/${id}` } : null
    }
    case 'SHOP': {
      const u = await prisma.user.findUnique({ where: { id }, select: { shopName: true, shopSlug: true } })
      return u?.shopName
        ? { title: u.shopName, url: u.shopSlug ? `/shop/${u.shopSlug}` : `/profile/${id}` }
        : null
    }
    case 'SCHOOL': {
      const u = await prisma.user.findUnique({ where: { id }, select: { schoolName: true, schoolSlug: true } })
      return u?.schoolName
        ? { title: u.schoolName, url: u.schoolSlug ? `/school/${u.schoolSlug}` : `/profile/${id}` }
        : null
    }
    case 'BLOG': {
      const u = await prisma.user.findUnique({ where: { id }, select: { blogName: true, blogSlug: true, name: true } })
      const title = u?.blogName || u?.name
      return title
        ? { title, url: u?.blogSlug ? `/blog/${u.blogSlug}` : `/profile/${id}` }
        : null
    }
    case 'PODCAST': {
      const u = await prisma.user.findUnique({ where: { id }, select: { podcastName: true, podcastSlug: true, name: true } })
      const title = u?.podcastName || u?.name
      return title
        ? { title, url: u?.podcastSlug ? `/podcast/${u.podcastSlug}` : `/profile/${id}` }
        : null
    }
    case 'BOARD': {
      const b = await prisma.bulletinBoard.findUnique({ where: { id }, select: { name: true, slug: true } })
      return b?.name ? { title: b.name, url: `/boards/${b.slug}` } : null
    }
    case 'USER': {
      const u = await prisma.user.findUnique({ where: { id }, select: { name: true, username: true } })
      const title = u?.name || u?.username
      return title ? { title, url: `/profile/${u?.username || id}` } : null
    }
    default:
      return null
  }
}
