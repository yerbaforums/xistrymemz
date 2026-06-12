import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    if (session.user.id !== id) {
      return apiError("Unauthorized", 401)
    }

    const links = await prisma.userLink.findMany({
      where: { userId: id },
      orderBy: { sortOrder: 'asc' }
    })

    return apiSuccess({ links })
  } catch (error) {
    console.error('Error fetching user links:', error)
    return apiError("Failed to fetch links", 500)
  }
}
