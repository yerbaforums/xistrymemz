import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '20'))
    const skip = (page - 1) * limit

    const [services, total] = await Promise.all([
      prisma.serviceOffering.findMany({
        where: { userId: session.user.id },
        include: {
          user: { select: { id: true, name: true, image: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.serviceOffering.count({ where: { userId: session.user.id } }),
    ])

    return apiSuccess({ services, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Error fetching user services:', error)
    return apiError("Failed to fetch services", 500)
  }
}
