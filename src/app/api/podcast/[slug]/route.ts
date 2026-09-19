import { apiSuccess, apiNotFound } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

// GET a public podcast by slug, including published episodes and any live room.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params

  const user = await prisma.user.findFirst({
    where: { podcastSlug: slug, showPodcast: true },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      location: true,
      podcastName: true,
      podcastAbout: true,
      podcastImage: true,
      podcastCoverImage: true,
      podcastSlug: true,
    },
  })

  if (!user) return apiNotFound('Podcast not found')

  const episodes = await prisma.podcastEpisode.findMany({
    where: { podcastId: user.id, published: true },
    orderBy: { publishedAt: 'desc' },
    take: 100,
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

  // Live broadcast room (audio mode) for this podcast, if any.
  const liveRoom = await prisma.videoRoom.findFirst({
    where: { podcastSlug: slug, mode: 'AUDIO', isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      inviteCode: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, image: true } },
      participants: {
        where: { leftAt: null },
        select: { userId: true, user: { select: { id: true, name: true, image: true } } },
      },
    },
  })

  return apiSuccess({
    podcast: { ...user, episodeCount: episodes.length },
    episodes,
    liveRoom: liveRoom
      ? {
          id: liveRoom.id,
          name: liveRoom.name,
          inviteCode: liveRoom.inviteCode,
          createdAt: liveRoom.createdAt.toISOString(),
          host: liveRoom.createdBy,
          listeners: liveRoom.participants.length,
        }
      : null,
    feedUrl: `/podcast/${slug}/feed.xml`,
  })
}