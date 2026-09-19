import { apiSuccess, apiError, apiUnauthorized, apiNotFound } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST create an episode (owner only); GET public list of published episodes.
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const podcast = await prisma.user.findFirst({
    where: { podcastSlug: slug, id: session.user.id },
    select: { id: true },
  })
  if (!podcast) return apiNotFound('Podcast not found')

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    title, description, audioUrl, durationSec, episodeNumber, isExplicit, published,
  } = body as {
    title?: string; description?: string; audioUrl?: string
    durationSec?: number; episodeNumber?: number | null
    isExplicit?: boolean; published?: boolean
  }

  if (!title?.trim()) return apiError('Title is required', 400)
  if (!audioUrl?.trim()) return apiError('Audio file is required', 400)

  const episode = await prisma.podcastEpisode.create({
    data: {
      podcastId: podcast.id,
      title: title.trim(),
      description: description?.trim() || '',
      audioUrl: audioUrl.trim(),
      durationSec: Math.max(0, Math.floor(durationSec || 0)),
      episodeNumber: episodeNumber ?? null,
      isExplicit: !!isExplicit,
      published: published !== undefined ? published : true,
      publishedAt: new Date(),
    },
    select: {
      id: true, title: true, description: true, audioUrl: true, durationSec: true,
      episodeNumber: true, isExplicit: true, published: true, publishedAt: true, createdAt: true,
    },
  })

  return apiSuccess({ episode })
}

// GET published episodes for a podcast (public).
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  const podcast = await prisma.user.findFirst({
    where: { podcastSlug: slug, showPodcast: true },
    select: { id: true },
  })
  if (!podcast) return apiNotFound('Podcast not found')

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: podcast.id, published: true },
    orderBy: { publishedAt: 'desc' },
    take: 100,
    select: {
      id: true, title: true, description: true, audioUrl: true, durationSec: true,
      episodeNumber: true, isExplicit: true, publishedAt: true,
    },
  })
  return apiSuccess({ episodes })
}