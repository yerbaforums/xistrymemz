import { prisma } from '@/lib/prisma'

export async function GET() {
  const baseUrl = 'https://xistrymemz.xyz'

  const recentItems = await Promise.all([
    prisma.product.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, description: true, createdAt: true, imageUrl: true, user: { select: { name: true } } } }),
    prisma.event.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, description: true, createdAt: true, organizerId: true } }),
    prisma.project.findMany({ take: 20, orderBy: { createdAt: 'desc' }, where: { published: true }, select: { id: true, title: true, description: true, createdAt: true, user: { select: { name: true } } } }),
    prisma.post.findMany({ take: 20, orderBy: { createdAt: 'desc' }, select: { id: true, content: true, createdAt: true, user: { select: { name: true } } } }),
  ])

  const allItems: { title: string; link: string; description: string; date: Date; author: string }[] = []

  for (const p of recentItems[0]) allItems.push({ title: p.title, link: `${baseUrl}/products/${p.id}`, description: p.description || '', date: p.createdAt, author: p.user?.name || 'Anonymous' })
  for (const e of recentItems[1]) allItems.push({ title: e.title, link: `${baseUrl}/events/${e.id}`, description: e.description || '', date: e.createdAt, author: 'Event Organizer' })
  for (const pl of recentItems[2]) allItems.push({ title: pl.title, link: `${baseUrl}/projects/${pl.id}`, description: pl.description || '', date: pl.createdAt, author: pl.user?.name || 'Anonymous' })
  for (const po of recentItems[3]) allItems.push({ title: po.content?.slice(0, 100) || 'New post', link: `${baseUrl}/posts/${po.id}`, description: po.content?.slice(0, 200) || '', date: po.createdAt, author: po.user?.name || 'Anonymous' })

  allItems.sort((a, b) => b.date.getTime() - a.date.getTime())
  const items = allItems.slice(0, 40)

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>XistrYmemZ</title>
    <link>${baseUrl}</link>
    <description>Latest products, events, plans, and posts from XistrYmemZ</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items.map(item => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <guid>${escapeXml(item.link)}</guid>
      <author>${escapeXml(item.author)}</author>
    </item>
    `).join('')}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
