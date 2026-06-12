import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = { userId: session.user.id }
    if (type) where.type = type

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ])

    return apiSuccess({ items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('GET /api/products/user:', error)
    return apiError("Internal server error", 500)
  }
}
