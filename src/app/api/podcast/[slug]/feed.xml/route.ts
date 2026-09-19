import { prisma } from '@/lib/prisma'
import { apiNotFound } from '@/lib/api-helpers'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://xistrymemz.xyz'
const XML_ESCAPE = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

function rfc822(date: Date): string {
  return date.toUTCString()
}

function audioType(url: string): string {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.mp3')) return 'audio/mpeg'
  if (clean.endsWith('.m4a') || clean.endsWith('.aac') || clean.endsWith('.mp4')) return 'audio/mp4'
  if (clean.endsWith('.ogg')) return 'audio/ogg'
  if (clean.endsWith('.wav')) return 'audio/wav'
  if (clean.endsWith('.webm')) return 'audio/webm'
  return 'audio/mpeg'
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  const podcast = await prisma.user.findFirst({
    where: { podcastSlug: slug, showPodcast: true },
    select: {
      id: true,
      name: true,
      username: true,
      podcastName: true,
      podcastAbout: true,
      podcastImage: true,
      podcastCoverImage: true,
      podcastSlug: true,
    },
  })

  if (!podcast) return apiNotFound('Podcast not found')

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: podcast.id, published: true },
    orderBy: { publishedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      description: true,
      audioUrl: true,
      durationSec: true,
      episodeNumber: true,
      isExplicit: true,
      publishedAt: true,
    },
  })

  const title = podcast.podcastName || podcast.name || slug
  const description = podcast.podcastAbout || 'A community podcast on XistrYmemZ.'
  const imageUrl = podcast.podcastCoverImage || podcast.podcastImage || ''
  const feedUrl = `${BASE}/podcast/${slug}/feed.xml`
  const pageUrl = `${BASE}/podcast/${slug}`

  const items = episodes
    .map((ep) => {
      const guid = `${pageUrl}/episodes/${ep.id}`
      const pubDate = rfc822(ep.publishedAt)
      const duration = ep.durationSec > 0
        ? `${Math.floor(ep.durationSec / 3600)}:${String(Math.floor((ep.durationSec % 3600) / 60)).padStart(2, '0')}:${String(ep.durationSec % 60).padStart(2, '0')}`
        : undefined
      return `    <item>
      <title>${XML_ESCAPE(ep.title)}</title>
      <description>${XML_ESCAPE(ep.description || '')}</description>
      <link>${XML_ESCAPE(guid)}</link>
      <guid isPermaLink="true">${XML_ESCAPE(guid)}</guid>
      <pubDate>${pubDate}</pubDate>
      <enclosure url="${XML_ESCAPE(ep.audioUrl)}" length="${ep.durationSec > 0 ? Math.max(1, Math.round((ep.durationSec * (64 * 1024)) / 8)) : 1}" type="${audioType(ep.audioUrl)}" />
      <itunes:duration>${duration || ''}</itunes:duration>
      <itunes:explicit>${ep.isExplicit ? 'true' : 'false'}</itunes:explicit>
      ${ep.episodeNumber ? `\n      <itunes:episode>${ep.episodeNumber}</itunes:episode>` : ''}
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${XML_ESCAPE(title)}</title>
    <link>${XML_ESCAPE(pageUrl)}</link>
    <description>${XML_ESCAPE(description)}</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(new Date())}</lastBuildDate>
    <atom:link href="${XML_ESCAPE(feedUrl)}" rel="self" type="application/rss+xml"/>
    <itunes:author>${XML_ESCAPE(podcast.name || title)}</itunes:author>
    <itunes:summary>${XML_ESCAPE(description)}</itunes:summary>
    <itunes:category text="Society &amp; Culture"/>
    <itunes:explicit>${episodes.some((e) => e.isExplicit) ? 'true' : 'false'}</itunes:explicit>
    <itunes:owner>
      <itunes:name>${XML_ESCAPE(podcast.name || title)}</itunes:name>
    </itunes:owner>
    ${imageUrl ? `<itunes:image href="${XML_ESCAPE(imageUrl)}"/>
    <image><url>${XML_ESCAPE(imageUrl)}</url><title>${XML_ESCAPE(title)}</title><link>${XML_ESCAPE(pageUrl)}</link></image>` : ''}
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}