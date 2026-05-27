import { prisma } from '@/lib/prisma'

export type EntityType =
  | 'PLAN' | 'PRODUCT' | 'POST' | 'EVENT' | 'SCHOOLCONTENT'
  | 'REQUEST' | 'SERVICE' | 'GROUP' | 'SHOP' | 'SCHOOL'

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
): Promise<any[]> {
  return prisma.backlink.findMany({
    where: { targetType, targetId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getOutgoingBacklinks(
  sourceType: EntityType,
  sourceId: string,
): Promise<any[]> {
  return prisma.backlink.findMany({
    where: { sourceType, sourceId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRelatedItems(
  entityType: EntityType,
  entityId: string,
): Promise<{ incoming: any[]; outgoing: any[] }> {
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
    ...incoming.map((b: any) => ({ type: b.sourceType, id: b.sourceId, dir: 'in' as const })),
    ...outgoing.map((b: any) => ({ type: b.targetType, id: b.targetId, dir: 'out' as const })),
  ]

  const unique = allLinks.filter(
    (link, i) => allLinks.findIndex(l => l.type === link.type && l.id === link.id) === i,
  )

  for (const link of unique.slice(0, 10)) {
    try {
      const title = await resolveEntityTitle(link.type as EntityType, link.id)
      if (title) {
        results.push({
          type: link.type,
          id: link.id,
          title,
          url: resolveEntityUrl(link.type as EntityType, link.id),
        })
      }
    } catch { }
  }

  return results
}

async function resolveEntityTitle(type: EntityType, id: string): Promise<string | null> {
  switch (type) {
    case 'PLAN': {
      const p = await prisma.plan.findUnique({ where: { id }, select: { title: true } })
      return p?.title || null
    }
    case 'PRODUCT': {
      const p = await prisma.product.findUnique({ where: { id }, select: { title: true } })
      return p?.title || null
    }
    case 'EVENT': {
      const e = await prisma.event.findUnique({ where: { id }, select: { title: true } })
      return e?.title || null
    }
    case 'REQUEST': {
      const r = await prisma.request.findUnique({ where: { id }, select: { title: true } })
      return r?.title || null
    }
    case 'SCHOOLCONTENT': {
      const s = await prisma.schoolContent.findUnique({ where: { id }, select: { title: true } })
      return s?.title || null
    }
    case 'SERVICE': {
      const s = await prisma.serviceOffering.findUnique({ where: { id }, select: { title: true } })
      return s?.title || null
    }
    case 'GROUP': {
      const g = await prisma.group.findUnique({ where: { id }, select: { name: true } })
      return g?.name || null
    }
    case 'POST': {
      const p = await prisma.post.findUnique({ where: { id }, select: { content: true } })
      return p ? p.content.slice(0, 80) : null
    }
    default:
      return null
  }
}

function resolveEntityUrl(type: EntityType, id: string): string {
  switch (type) {
    case 'PLAN': return `/plans/${id}`
    case 'PRODUCT': return `/products/${id}`
    case 'EVENT': return `/events/${id}`
    case 'REQUEST': return `/requests/${id}`
    case 'SERVICE': return `/services/${id}`
    case 'GROUP': return `/groups/${id}`
    case 'POST': return `/posts/${id}`
    default: return '#'
  }
}
