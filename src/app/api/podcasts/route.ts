import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

// GET list all podcasts (like /api/blogs)
export async function GET() {
  try {
    const podcasts = await prisma.user.findMany({
      where: {
        podcastSlug: { not: null },
        podcastName: { not: '' },
        showPodcast: true,
      },
      select: {
        id: true,
        podcastName: true,
        podcastAbout: true,
        podcastImage: true,
        podcastCoverImage: true,
        podcastSlug: true,
        name: true,
        username: true,
        image: true,
        location: true,
        _count: {
          select: { podcastEpisodes: { where: { published: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const data = await Promise.all(
      podcasts.map(async (p) => {
        const [latest, live] = await Promise.all([
          prisma.podcastEpisode.findFirst({
            where: { podcastId: p.id, published: true },
            orderBy: { publishedAt: 'desc' },
            select: { title: true, publishedAt: true, durationSec: true },
          }),
          prisma.videoRoom.findFirst({
            where: { podcastSlug: p.podcastSlug as string, mode: 'AUDIO', isActive: true },
            select: { id: true, name: true, inviteCode: true },
          }),
        ])
        return { ...p, latestEpisode: latest, isLive: !!live, liveInviteCode: live?.inviteCode || null }
      })
    )

    return apiSuccess({ podcasts: data })
  } catch (error) {
    console.error('Error fetching podcasts:', error)
    return apiSuccess({ podcasts: [] })
  }
}