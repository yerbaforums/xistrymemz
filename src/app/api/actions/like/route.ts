import { apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PLAN','REQUEST','SCHOOLCONTENT','GROUP','SHOP']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { entityType, entityId, liked } = await request.json()
    if (!entityType || !entityId) {
      return apiError("Missing entityType or entityId", 400)
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return apiError("Invalid entity type", 400)
    }

    if (liked) {
      await prisma.entityLike.upsert({
        where: {
          userId_entityType_entityId: {
            userId: session.user.id,
            entityType: type,
            entityId,
          },
        },
        create: {
          userId: session.user.id,
          entityType: type,
          entityId,
        },
        update: {},
      })
    } else {
      await prisma.entityLike.deleteMany({
        where: {
          userId: session.user.id,
          entityType: type,
          entityId,
        },
      })
    }

    const likeCount = await prisma.entityLike.count({
      where: { entityType: type, entityId },
    })

    return NextResponse.json({ liked, likeCount })
  } catch (error) {
    console.error('Like error:', error)
    return apiError("Internal server error", 500)
  }
}
