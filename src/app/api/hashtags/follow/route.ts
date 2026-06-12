import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const follows = await prisma.userHashtagFollow.findMany({
      where: { userId: session.user.id },
      include: { hashtag: true },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(follows.map(f => f.hashtag))
  } catch {
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { tag, tags } = await request.json()

    if (tags && Array.isArray(tags)) {
      const hashtags = await prisma.hashtag.findMany({
        where: { tag: { in: tags.map(t => t.toLowerCase()) } },
      })
      const existing = await prisma.userHashtagFollow.findMany({
        where: { userId: session.user.id, hashtagId: { in: hashtags.map(h => h.id) } },
      })
      const existingIds = new Set(existing.map(e => e.hashtagId))
      const toCreate = hashtags.filter(h => !existingIds.has(h.id))
      if (toCreate.length > 0) {
        await prisma.userHashtagFollow.createMany({
          data: toCreate.map(h => ({ userId: session.user.id, hashtagId: h.id })),
        })
      }
      return NextResponse.json({ success: true, followed: toCreate.length })
    }

    if (!tag || typeof tag !== 'string') {
      return apiError("Missing or invalid tag", 400)
    }

    const hashtag = await prisma.hashtag.findUnique({ where: { tag: tag.toLowerCase() } })
    if (!hashtag) {
      return apiError("Hashtag not found", 404)
    }

    const existing = await prisma.userHashtagFollow.findUnique({
      where: { userId_hashtagId: { userId: session.user.id, hashtagId: hashtag.id } },
    })

    if (existing) {
      return apiSuccess({ message: 'Already following' })
    }

    await prisma.userHashtagFollow.create({
      data: { userId: session.user.id, hashtagId: hashtag.id },
    })

    return apiSuccess({ success: true })
  } catch {
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const { tag } = await request.json()
    if (!tag || typeof tag !== 'string') {
      return apiError("Missing or invalid tag", 400)
    }

    const hashtag = await prisma.hashtag.findUnique({ where: { tag: tag.toLowerCase() } })
    if (!hashtag) {
      return apiError("Hashtag not found", 404)
    }

    await prisma.userHashtagFollow.deleteMany({
      where: { userId: session.user.id, hashtagId: hashtag.id },
    })

    return apiSuccess({ success: true })
  } catch {
    return apiError("Internal server error", 500)
  }
}
