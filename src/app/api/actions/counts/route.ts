import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const authorId = searchParams.get('authorId')

    if (!entityType || !entityId) {
      return apiError("Missing entityType or entityId", 400)
    }

    const session = await getServerSession(authOptions)
    const type = entityType.toUpperCase()

    const [likeCount, replyCount, tipTotal, viewCount, liked, saved] = await Promise.all([
      prisma.entityLike.count({ where: { entityType: type, entityId } }),
      prisma.entityReply.count({ where: { entityType: type, entityId } }),
      prisma.entityTip.aggregate({ where: { entityType: type, entityId }, _sum: { amount: true } }),
      prisma.contentView.count({ where: { entityType: type, entityId } }),
      session?.user?.id
        ? prisma.entityLike.findUnique({ where: { userId_entityType_entityId: { userId: session.user.id, entityType: type, entityId } } })
        : null,
      session?.user?.id
        ? prisma.savedItem.findUnique({ where: { userId_itemType_itemId: { userId: session.user.id, itemType: type, itemId: entityId } } })
        : null,
    ])

    let authorSettings = null
    if (authorId) {
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { enableTips: true, enableReplies: true, enableLikes: true, showViewCount: true, showShop: true, showSchool: true },
      })
      authorSettings = author
    }

    return NextResponse.json({
      likeCount,
      replyCount,
      tipTotal: tipTotal._sum.amount || 0,
      viewCount,
      liked: !!liked,
      saved: !!saved,
      authorSettings,
    })
  } catch (error) {
    console.error('Counts error:', error)
    return apiError("Internal server error", 500)
  }
}
