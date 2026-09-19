import { apiSuccess, apiUnauthorized, apiNotFound } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PATCH edit an episode or DELETE it. Owner only.
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const episode = await prisma.podcastEpisode.findUnique({
    where: { id },
    select: { podcastId: true },
  })
  if (!episode) return apiNotFound('Episode not found')
  if (episode.podcastId !== session.user.id) return apiUnauthorized()

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    title, description, audioUrl, durationSec, episodeNumber, isExplicit, published,
  } = body as {
    title?: string; description?: string; audioUrl?: string
    durationSec?: number; episodeNumber?: number | null
    isExplicit?: boolean; published?: boolean
  }

  const updated = await prisma.podcastEpisode.update({
    where: { id },
    data: {
      ...(typeof title === 'string' ? { title: title.trim() || undefined } : {}),
      ...(typeof description === 'string' ? { description: description.trim() } : {}),
      ...(typeof audioUrl === 'string' ? { audioUrl: audioUrl.trim() } : {}),
      ...(typeof durationSec === 'number' ? { durationSec: Math.max(0, Math.floor(durationSec)) } : {}),
      ...(typeof episodeNumber === 'number' || episodeNumber === null ? { episodeNumber } : {}),
      ...(typeof isExplicit === 'boolean' ? { isExplicit } : {}),
      ...(typeof published === 'boolean' ? { published } : {}),
    },
    select: {
      id: true, title: true, description: true, audioUrl: true, durationSec: true,
      episodeNumber: true, isExplicit: true, published: true, publishedAt: true, createdAt: true,
    },
  })

  return apiSuccess({ episode: updated })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const episode = await prisma.podcastEpisode.findUnique({
    where: { id },
    select: { podcastId: true },
  })
  if (!episode) return apiNotFound('Episode not found')
  if (episode.podcastId !== session.user.id) return apiUnauthorized()

  await prisma.podcastEpisode.delete({ where: { id } })
  return apiSuccess({ deleted: true })
}