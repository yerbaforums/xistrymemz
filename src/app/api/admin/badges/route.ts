import { apiError, apiSuccess, requireAdmin } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId

    const badges = await prisma.badge.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        awardedByUser: { select: { id: true, name: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess({ badges })
  } catch (err) {
    if (err instanceof Error && err.message === 'Admin access required') return apiError(err.message, 401)
    if (err instanceof Error && err.message === 'Unauthorized') return apiError(err.message, 401)
    console.error('Badges GET error:', err)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAdmin()
    const body = await request.json()
    const { userId: targetUserId, name, tier = 'BRONZE', description } = body as {
      userId: string; name: string; tier: string; description?: string
    }

    if (!targetUserId || !name) return apiError('userId and name are required', 400)

    const validTiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
    if (!validTiers.includes(tier)) return apiError('Invalid tier', 400)

    const badge = await prisma.badge.upsert({
      where: { userId_name: { userId: targetUserId, name } },
      update: { tier, description, awardedBy: userId },
      create: { name, tier, description, userId: targetUserId, awardedBy: userId },
      include: {
        user: { select: { id: true, name: true, username: true } },
        awardedByUser: { select: { id: true, name: true } },
      },
    })

    return apiSuccess({ badge })
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Admin access required')) {
      return apiError(err.message, 401)
    }
    console.error('Badges POST error:', err)
    return apiError('Internal server error', 500)
  }
}
