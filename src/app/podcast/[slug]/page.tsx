import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import PodcastDetailClient from './PodcastDetailClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const user = await prisma.user.findFirst({
    where: { podcastSlug: slug, showPodcast: true },
    select: { podcastName: true, podcastAbout: true, podcastImage: true, name: true },
  })
  if (!user) return {}
  const title = `${user.podcastName || user.name || slug} — Podcast — XistrYmemZ`
  const description = user.podcastAbout?.slice(0, 160) || `Podcast by ${user.podcastName || user.name || slug}`
  return {
    title,
    description,
    openGraph: { title, description, images: user.podcastImage ? [user.podcastImage] : [] },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { types: { 'application/rss+xml': `/podcast/${slug}/feed.xml` } },
  }
}

export default function PodcastDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PodcastDetailClient params={params} />
}