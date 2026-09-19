import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

// GET own podcast (caller's podcast settings)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      podcastName: true,
      podcastAbout: true,
      podcastImage: true,
      podcastCoverImage: true,
      podcastSlug: true,
      showPodcast: true,
    },
  })
  return apiSuccess(user)
}

// PUT create/update own podcast settings
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    podcastName, podcastAbout, podcastImage, podcastCoverImage, podcastSlug, showPodcast,
  } = body as {
    podcastName?: string; podcastAbout?: string; podcastImage?: string
    podcastCoverImage?: string; podcastSlug?: string; showPodcast?: boolean
  }

  if (!podcastName?.trim()) {
    return apiError('Podcast name is required', 400)
  }

  const slug = (podcastSlug || slugify(podcastName)) || null
  if (!slug) return apiError('Podcast slug is required', 400)

  const existing = await prisma.user.findFirst({
    where: { podcastSlug: slug, id: { not: session.user.id } },
    select: { id: true },
  })
  if (existing) return apiError('That podcast slug is already taken', 409)

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      podcastName: podcastName.trim(),
      podcastAbout: podcastAbout?.trim() || null,
      podcastImage: podcastImage || null,
      podcastCoverImage: podcastCoverImage || null,
      podcastSlug: slug,
      showPodcast: showPodcast !== undefined ? showPodcast : true,
    },
  })

  return apiSuccess({
    podcastName: user.podcastName,
    podcastAbout: user.podcastAbout,
    podcastImage: user.podcastImage,
    podcastCoverImage: user.podcastCoverImage,
    podcastSlug: user.podcastSlug,
    showPodcast: user.showPodcast,
  })
}