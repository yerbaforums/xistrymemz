import { apiError, apiSuccess, requireAdmin } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    const { userId } = body as { userId: string }

    if (!userId) return apiError('userId is required', 400)

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isShopApproved: true } })
    if (!user) return apiError('Not found', 404)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isShopApproved: !user.isShopApproved,
        shopApprovedAt: !user.isShopApproved ? new Date() : null,
      },
      select: { id: true, isShopApproved: true, shopApprovedAt: true },
    })

    return apiSuccess({ user: updated })
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Admin access required')) {
      return apiError(err.message, 401)
    }
    console.error('Shop approve error:', err)
    return apiError('Internal server error', 500)
  }
}
