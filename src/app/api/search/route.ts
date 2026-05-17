import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '10')

  if (!query || query.length < 2) {
    return NextResponse.json({ results: {} })
  }

  const hashtagQuery = query.startsWith('#') ? query.slice(1).toLowerCase() : ''

  const [plans, products, users, groups, events, requests, schoolContent, forumPosts, hashtags] = await Promise.all([
    prisma.plan.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
        published: true,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      select: { id: true, title: true, description: true, status: true },
      take: limit
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ]
      },
      select: { id: true, title: true, description: true, price: true, type: true },
      take: limit
    }),
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
        ]
      },
      select: { id: true, name: true, image: true, bio: true },
      take: limit
    }),
    prisma.group.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
        isPrivate: false
      },
      select: { id: true, name: true, description: true, _count: { select: { members: true } } },
      take: limit
    }),
    prisma.event.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ]
      },
      select: { id: true, title: true, eventDate: true, location: true, eventCategory: true },
      take: limit
    }),
    prisma.request.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
        isPublic: true
      },
      select: { id: true, title: true, description: true, status: true, category: true },
      take: limit
    }),
    prisma.schoolContent.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ]
      },
      select: { id: true, title: true, contentType: true, price: true },
      take: limit
    }),
    prisma.forumPost.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { content: { contains: query } },
        ]
      },
      select: { id: true, title: true, content: true, createdAt: true, authorId: true },
      take: limit
    }),
    hashtagQuery ? prisma.hashtag.findMany({
      where: { tag: { contains: hashtagQuery } },
      orderBy: { postCount: 'desc' },
      take: limit
    }) : Promise.resolve([])
  ])

  const results = {
    plans: plans.map(p => ({ ...p, type: 'plan', url: `/plans/${p.id}` })),
    products: products.map(p => ({ ...p, type: 'product', url: `/products/${p.id}` })),
    users: users.map(u => ({ ...u, type: 'user', url: `/profile/${u.id}` })),
    groups: groups.map(g => ({ ...g, type: 'group', url: `/groups/${g.id}`, memberCount: g._count.members })),
    events: events.map(e => ({ ...e, type: 'event', url: `/events/${e.id}` })),
    requests: requests.map(r => ({ ...r, type: 'request', url: `/requests/${r.id}` })),
    schoolContent: schoolContent.map(s => ({ ...s, type: 'school', url: `/schools` })),
    forumPosts: forumPosts.map(p => ({ ...p, type: 'forumPost', url: `/community/forum/${p.id}` })),
    hashtags: hashtags.map(h => ({ tag: h.tag, postCount: h.postCount, type: 'hashtag', url: `/hashtag/${h.tag}` }))
  }

  return NextResponse.json({ results, query })
}