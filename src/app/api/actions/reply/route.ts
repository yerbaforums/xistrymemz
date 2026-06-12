import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PLAN','REQUEST','SCHOOLCONTENT','GROUP','SHOP','FORUMPOST']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { entityType, entityId, content } = await request.json()
    if (!entityType || !entityId || !content?.trim()) {
      return apiError("Missing required fields", 400)
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return apiError("Invalid entity type", 400)
    }

    const reply = await prisma.entityReply.create({
      data: {
        userId: session.user.id,
        entityType: type,
        entityId,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    return apiSuccess({ reply })
  } catch (error) {
    console.error('Reply error:', error)
    return apiError("Internal server error", 500)
  }
}
