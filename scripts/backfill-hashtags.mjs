// Backfill hashtag links for content created before the universal hashtag
// wiring (2026-06-08, c7ef0aa). Idempotent: only ADDS links for entities that
// contain #tags (never wipes), upserts Hashtag rows, then recomputes postCount
// from the junction tables (the source of truth — rows cascade on delete).
//
// Usage: node --env-file=.env scripts/backfill-hashtags.mjs
// (Needs DATABASE_URL; --env-file requires Node 20.6+.)
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TAG_RE = /#(\w{2,50})/g

function extractHashtags(text) {
  const tags = []
  const seen = new Set()
  let m
  TAG_RE.lastIndex = 0
  while ((m = TAG_RE.exec(text || '')) !== null) {
    const tag = m[1].toLowerCase()
    if (!seen.has(tag)) {
      seen.add(tag)
      tags.push(tag)
    }
  }
  return tags
}

async function upsertTags(tags) {
  const ids = []
  for (const tag of tags) {
    const h = await prisma.hashtag.upsert({ where: { tag }, create: { tag }, update: {} })
    ids.push(h.id)
  }
  return ids
}

// Replace this entity's links with the given tags (entity-scoped delete).
async function relink(model, idField, entityId, hashtagIds, extra = {}) {
  await prisma[model].deleteMany({ where: { [idField]: entityId } })
  for (const hashtagId of hashtagIds) {
    await prisma[model].create({ data: { [idField]: entityId, hashtagId, ...extra } })
  }
}

const SOURCES = [
  { label: 'posts', model: 'post', idField: 'postId', junction: 'postHashtag', extra: { sourceType: 'POST' },
    find: () => prisma.post.findMany({ select: { id: true, content: true } }), text: r => r.content },
  { label: 'forumPosts', model: 'forumPost', idField: 'postId', junction: 'postHashtag', extra: { sourceType: 'FORUMPOST' },
    find: () => prisma.forumPost.findMany({ select: { id: true, title: true, content: true } }), text: r => `${r.title || ''} ${r.content || ''}` },
  { label: 'groupPosts', model: 'groupPost', idField: 'postId', junction: 'postHashtag', extra: { sourceType: 'GROUPPOST' },
    find: () => prisma.groupPost.findMany({ select: { id: true, content: true } }), text: r => r.content },
  { label: 'products', model: 'product', idField: 'productId', junction: 'productHashtag', extra: {},
    find: () => prisma.product.findMany({ select: { id: true, title: true, description: true } }), text: r => `${r.title || ''} ${r.description || ''}` },
  { label: 'events', model: 'event', idField: 'eventId', junction: 'eventHashtag', extra: {},
    find: () => prisma.event.findMany({ select: { id: true, title: true, description: true } }), text: r => `${r.title || ''} ${r.description || ''}` },
  { label: 'services', model: 'serviceOffering', idField: 'serviceOfferingId', junction: 'serviceOfferingHashtag', extra: { sourceType: 'SERVICE' },
    find: () => prisma.serviceOffering.findMany({ select: { id: true, title: true, description: true } }), text: r => `${r.title || ''} ${r.description || ''}` },
  { label: 'schoolContents', model: 'schoolContent', idField: 'schoolContentId', junction: 'schoolContentHashtag', extra: {},
    find: () => prisma.schoolContent.findMany({ select: { id: true, title: true, content: true } }), text: r => `${r.title || ''} ${r.content || ''}` },
  { label: 'projects', model: 'project', idField: 'projectId', junction: 'projectHashtag', extra: {},
    find: () => prisma.project.findMany({ select: { id: true, title: true, description: true } }), text: r => `${r.title || ''} ${r.description || ''}` },
  { label: 'requests', model: 'request', idField: 'requestId', junction: 'requestHashtag', extra: {},
    find: () => prisma.request.findMany({ select: { id: true, title: true, description: true } }), text: r => `${r.title || ''} ${r.description || ''}` },
  { label: 'groups', model: 'group', idField: 'groupId', junction: 'groupHashtag', extra: {},
    find: () => prisma.group.findMany({ select: { id: true, name: true, description: true } }), text: r => `${r.name || ''} ${r.description || ''}` },
  { label: 'blogPosts', model: 'blogPost', idField: 'blogPostId', junction: 'blogPostHashtag', extra: {},
    find: () => prisma.blogPost.findMany({ select: { id: true, title: true, content: true } }), text: r => `${r.title || ''} ${r.content || ''}` },
]

async function main() {
  const summary = {}
  for (const src of SOURCES) {
    let rows
    try {
      rows = await src.find()
    } catch (e) {
      console.log(`${src.label}: SKIPPED (${e.message?.split('\n')[0]})`)
      continue
    }
    let linked = 0
    let tagUses = 0
    for (const row of rows) {
      const tags = extractHashtags(src.text(row))
      if (tags.length === 0) continue // backfill only adds, never wipes
      try {
        const ids = await upsertTags(tags)
        await relink(src.junction, src.idField, row.id, ids, src.extra)
        linked++
        tagUses += tags.length
      } catch (e) {
        console.log(`  ${src.label}/${row.id}: ERROR ${e.message?.split('\n')[0]}`)
      }
    }
    summary[src.label] = { rows: rows.length, linked, tagUses }
    console.log(`${src.label}: ${rows.length} rows, ${linked} linked, ${tagUses} tag uses`)
  }

  // Recompute postCount from junction tables (source of truth).
  const junctions = ['postHashtag', 'productHashtag', 'eventHashtag', 'serviceOfferingHashtag',
    'schoolContentHashtag', 'projectHashtag', 'requestHashtag', 'groupHashtag', 'blogPostHashtag']
  const allTags = await prisma.hashtag.findMany({ select: { id: true, tag: true } })
  let updated = 0
  for (const h of allTags) {
    let total = 0
    for (const j of junctions) {
      total += await prisma[j].count({ where: { hashtagId: h.id } })
    }
    await prisma.hashtag.update({ where: { id: h.id }, data: { postCount: total } })
    updated++
  }
  console.log(`postCount recomputed for ${updated} hashtags`)
  console.log(JSON.stringify(summary))
}

main()
  .catch(e => { console.error('FATAL', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
