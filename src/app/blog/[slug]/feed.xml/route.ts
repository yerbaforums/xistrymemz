import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Per-blog RSS feed (Substack-style): /blog/[slug]/feed.xml
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const baseUrl = 'https://xistrymemz.xyz'

  const blog = await prisma.user.findFirst({
    where: { blogSlug: slug, showBlog: true },
    select: { id: true, blogName: true, blogTagline: true, name: true },
  })
  if (!blog) {
    return new Response('Blog not found', { status: 404 })
  }

  const posts = await prisma.blogPost.findMany({
    where: { blogId: blog.id, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      id: true, slug: true, title: true, excerpt: true, content: true,
      coverImage: true, publishedAt: true, createdAt: true, visibility: true,
    },
  })

  const blogUrl = `${baseUrl}/blog/${slug}`
  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(blog.blogName || blog.name || slug)}</title>
    <link>${blogUrl}</link>
    <description>${escapeXml(blog.blogTagline || `Posts from ${blog.blogName || blog.name || slug}`)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${blogUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${posts.map(p => `
    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${blogUrl}/${escapeXml(p.slug)}</link>
      <description><![CDATA[${p.coverImage ? `<img src="${p.coverImage}" alt="" /><br/>` : ''}${escapeXml(p.excerpt || stripHtml(p.content).slice(0, 200))}]]></description>
      <pubDate>${(p.publishedAt || p.createdAt).toUTCString()}</pubDate>
      <guid>${blogUrl}/${escapeXml(p.slug)}</guid>
      <author>${escapeXml(blog.blogName || blog.name || slug)}</author>
    </item>
    `).join('')}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600',
    },
  })
}