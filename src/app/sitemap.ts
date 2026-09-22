import { prisma } from '@/lib/prisma'
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://xistrymemz.xyz'

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/boards`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/discover`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/shops`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/blogs`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/podcasts`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/photos`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${baseUrl}/services`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    // NOTE: bare /community requires auth (members hub) — only the public
    // forum/groups surfaces are listed for crawlers.
    { url: `${baseUrl}/community/forum`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/community/groups`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/projects`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.7 },
    { url: `${baseUrl}/requests`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/directory`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/hashtags`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${baseUrl}/schools`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
  ]

  try {
    const [boards, products, events, services, projects, requests, groups, shops, forumPosts, trips, posts, blogs, blogPosts, podcasts] = await Promise.all([
      prisma.bulletinBoard.findMany({ select: { slug: true, updatedAt: true }, where: { isPublic: true }, take: 500 }),
      prisma.product.findMany({ select: { id: true, updatedAt: true }, where: { published: true }, take: 1000 }),
      prisma.event.findMany({ select: { id: true, updatedAt: true }, take: 500 }),
      prisma.serviceOffering.findMany({ select: { id: true, updatedAt: true }, take: 500 }),
      prisma.project.findMany({ select: { id: true, updatedAt: true }, where: { published: true }, take: 500 }),
      prisma.request.findMany({ select: { id: true, updatedAt: true }, take: 500 }),
      prisma.group.findMany({ select: { id: true, updatedAt: true }, take: 500 }),
      prisma.user.findMany({ select: { shopSlug: true, updatedAt: true }, where: { shopSlug: { not: null } }, take: 500 }),
      prisma.forumPost.findMany({ select: { id: true, updatedAt: true }, take: 500, orderBy: { updatedAt: 'desc' } }),
      prisma.trip.findMany({ select: { id: true, updatedAt: true }, take: 200, orderBy: { updatedAt: 'desc' } }),
      prisma.post.findMany({ select: { id: true, updatedAt: true }, take: 500, orderBy: { updatedAt: 'desc' } }),
      prisma.user.findMany({ select: { blogSlug: true, updatedAt: true }, where: { blogSlug: { not: null }, showBlog: true }, take: 500 }),
      prisma.blogPost.findMany({ select: { id: true, slug: true, updatedAt: true, blog: { select: { blogSlug: true } } }, where: { status: 'PUBLISHED' }, take: 500, orderBy: { updatedAt: 'desc' } }),
      prisma.user.findMany({ select: { podcastSlug: true, updatedAt: true }, where: { podcastSlug: { not: null }, showPodcast: true }, take: 500 }),
    ])

    const dynamicPages: MetadataRoute.Sitemap = [
      ...boards.map(b => ({ url: `${baseUrl}/boards/${b.slug}`, lastModified: b.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...products.map(p => ({ url: `${baseUrl}/products/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...events.map(e => ({ url: `${baseUrl}/events/${e.id}`, lastModified: e.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...services.map(s => ({ url: `${baseUrl}/services/${s.id}`, lastModified: s.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...projects.map(p => ({ url: `${baseUrl}/projects/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
      ...requests.map(r => ({ url: `${baseUrl}/requests/${r.id}`, lastModified: r.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...groups.map(g => ({ url: `${baseUrl}/groups/${g.id}`, lastModified: g.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...shops.filter(s => s.shopSlug).map(s => ({ url: `${baseUrl}/shop/${s.shopSlug}`, lastModified: s.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...forumPosts.map(p => ({ url: `${baseUrl}/community/forum/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'daily' as const, priority: 0.6 })),
      ...trips.map(t => ({ url: `${baseUrl}/trips/${t.id}`, lastModified: t.updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
      ...posts.map(p => ({ url: `${baseUrl}/posts/${p.id}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
      ...blogs.filter(b => b.blogSlug).map(b => ({ url: `${baseUrl}/blog/${b.blogSlug}`, lastModified: b.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
      ...blogPosts.filter(bp => bp.blog.blogSlug).map(bp => ({ url: `${baseUrl}/blog/${bp.blog.blogSlug}/${bp.slug}`, lastModified: bp.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
      ...podcasts.filter(p => p.podcastSlug).map(p => ({ url: `${baseUrl}/podcast/${p.podcastSlug}`, lastModified: p.updatedAt, changeFrequency: 'daily' as const, priority: 0.7 })),
    ]

    return [...staticPages, ...dynamicPages]
  } catch {
    return staticPages
  }
}
