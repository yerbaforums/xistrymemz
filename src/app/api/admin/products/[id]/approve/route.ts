import { apiError, apiSuccess, requireAdmin } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await requireAdmin()
    const { id } = await params

    const product = await prisma.product.findUnique({ where: { id } })
    if (!product) return apiError('Not found', 404)

    const newApproved = !product.isApproved
    const updated = await prisma.product.update({
      where: { id },
      data: {
        isApproved: newApproved,
        approvedBy: newApproved ? userId : null,
        approvedAt: newApproved ? new Date() : null,
      },
      select: { id: true, isApproved: true, approvedBy: true, approvedAt: true },
    })

    return apiSuccess({ product: updated })
  } catch (err) {
    if (err instanceof Error && (err.message === 'Unauthorized' || err.message === 'Admin access required')) {
      return apiError(err.message, 401)
    }
    console.error('Product approve error:', err)
    return apiError('Internal server error', 500)
  }
}
