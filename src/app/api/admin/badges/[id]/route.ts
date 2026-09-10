import { apiError, apiSuccess, requireAdmin } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const { name, tier, description } = body as { name?: string; tier?: string; description?: string }

    if (tier) {
      const validTiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']
      if (!validTiers.includes(tier)) return apiError('Invalid tier', 400)
    }

    const badge = await prisma.badge.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(tier !== undefined && { tier }),
        ...(description !== undefined && { description }),
      },
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
    console.error('Badge PUT error:', err)
    return apiError('Internal server error', 500)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.badge.delete({ where: { id } })
    return apiSuccess({ deleted: true })
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Admin access required')) {
      return apiError(err.message, 401)
    }
    console.error('Badge DELETE error:', err)
    return apiError('Internal server error', 500)
  }
}
