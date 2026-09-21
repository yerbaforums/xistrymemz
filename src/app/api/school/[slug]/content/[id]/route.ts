import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'
import { isAllowedMediaUrl, POST_VIDEO_KINDS } from '@/lib/media-links'

export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params
  const content = await prisma.schoolContent.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      user: { select: { id: true, schoolName: true, schoolSlug: true, image: true } },
      hashtags: { include: { hashtag: { select: { id: true, tag: true } } } },
      _count: { select: { likes: true } },
      originalContent: {
        include: {
          author: { select: { name: true } },
          user: { select: { schoolName: true, schoolSlug: true } }
        }
      }
    }
  })
  if (!content) return apiError("Not found", 404)

  // Paid content: redact body for non-owners without a completed purchase
  if (content.isPaid) {
    try {
      const session = await getServerSession(authOptions)
      const viewerId = session?.user?.id as string | undefined
      const isOwner = !!viewerId && viewerId === content.userId
      let hasAccess = isOwner
      if (!hasAccess && viewerId) {
        const purchase = await prisma.schoolPurchase.findFirst({
          where: { contentId: id, userId: viewerId, status: 'COMPLETED' },
          select: { id: true },
        })
        hasAccess = !!purchase
      }
      if (!hasAccess) {
        const preview = content.content.slice(0, 200)
        return apiSuccess({ ...content, content: preview, locked: true })
      }
    } catch { /* fall through unlocked on error */ }
  }
  return apiSuccess({ ...content, locked: false })
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { slug, id } = await params
  const school = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!school || school.id !== session.user.id) return apiError("Forbidden", 403)

  const body = await request.json()
  const existing = await prisma.schoolContent.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return apiError("Not found", 404)

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.content !== undefined) data.content = body.content
  if (body.contentType !== undefined) data.contentType = body.contentType
  if (body.price !== undefined) data.price = body.price
  if (body.isPaid !== undefined) data.isPaid = body.isPaid
  if (body.pinned !== undefined) data.pinned = body.pinned
  if (body.images !== undefined) data.images = body.images
  if (body.videoUrl !== undefined) {
    if (body.videoUrl && !isAllowedMediaUrl(body.videoUrl, POST_VIDEO_KINDS)) {
      return apiError("Video must be a YouTube, Vimeo, or direct mp4/webm link", 400)
    }
    data.videoUrl = body.videoUrl
  }
  if (body.section !== undefined) data.contentSection = body.section
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder

  const updated = await prisma.schoolContent.update({ where: { id }, data })

  if (body.hashtags !== undefined && Array.isArray(body.hashtags)) {
    await linkHashtags('SCHOOLCONTENT', id, body.hashtags)
  } else {
    const title = data.title || existing.title
    const content = data.content || existing.content
    await extractAndLinkHashtags(String(title) + ' ' + String(content), 'SCHOOLCONTENT', id)
  }

  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { slug, id } = await params
  const school = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!school || school.id !== session.user.id) return apiError("Forbidden", 403)

  const existing = await prisma.schoolContent.findUnique({ where: { id } })
  if (!existing || existing.userId !== session.user.id) return apiError("Not found", 404)

  await prisma.schoolContent.delete({ where: { id } })
  return apiSuccess({ success: true })
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { slug, id } = await params
  const targetSchool = await prisma.user.findFirst({ where: { schoolSlug: slug } })
  if (!targetSchool || targetSchool.id !== session.user.id) return apiError("Forbidden", 403)

  const originalContent = await prisma.schoolContent.findUnique({ where: { id } })
  if (!originalContent) return apiError("Not found", 404)

  const body = await request.json()
  const reposted = await prisma.schoolContent.create({
    data: {
      title: body.title || originalContent.title,
      content: body.content || originalContent.content,
      contentType: body.contentType || originalContent.contentType,
      userId: targetSchool.id,
      authorId: originalContent.authorId,
      originalContentId: originalContent.id
    },
    include: { author: { select: { name: true } }, originalContent: { include: { author: { select: { name: true } }, user: { select: { schoolName: true, schoolSlug: true } } } } }
  })
  return apiSuccess(reposted)
}
