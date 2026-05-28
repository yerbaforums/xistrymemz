import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PLAN','REQUEST','SCHOOLCONTENT','GROUP','SHOP']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entityType, entityId, liked } = await request.json()
    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'Missing entityType or entityId' }, { status: 400 })
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
