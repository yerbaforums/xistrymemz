import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return apiSuccess({ replies: [] })
    }

    const replies = await prisma.entityReply.findMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId,
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return apiSuccess({ replies })
  } catch (error) {
    console.error('Fetch replies error:', error)
    return apiError("Internal server error", 500)
  }
}
