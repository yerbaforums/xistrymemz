import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shops = await prisma.user.findMany({
      where: {
        shopSlug: { not: null },
        shopName: { not: '' }
      },
      select: {
        id: true,
        shopName: true,
        shopAbout: true,
        shopImage: true,
        shopSlug: true,
        shopCategory: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess({ shops })
  } catch (error) {
    console.error('Error fetching shops:', error)
    return apiError("Failed to fetch shops", 500)
  }
}
