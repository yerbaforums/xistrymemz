import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { entityType, entityId } = await request.json()

    if (!entityType || !entityId) {
      return apiError("Missing entityType or entityId", 400)
    }

    await prisma.contentView.create({
      data: {
        userId: session?.user?.id || null,
        entityType: entityType.toUpperCase(),
        entityId,
      },
    })

    return apiSuccess({ recorded: true })
  } catch (error) {
    console.error('View record error:', error)
    return apiError("Internal server error", 500)
  }
}
