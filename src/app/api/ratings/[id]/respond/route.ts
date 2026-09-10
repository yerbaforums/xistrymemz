import { apiSuccess, apiError, handleApi, requireAuth } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { userId } = await requireAuth()
    const { id: ratingId } = await context.params
    const body = await req.json()

    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      throw new Error('Content is required')
    }

    const rating = await prisma.rating.findUnique({ where: { id: ratingId } })
    if (!rating) throw new Error('Rating not found')

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const isAdmin = user?.role === 'ADMIN'
    if (rating.userId !== userId && !isAdmin) {
      throw new Error('Only the ratee or an admin can respond')
    }

    const existing = await prisma.reviewResponse.findUnique({
      where: { ratingId_userId: { ratingId, userId } }
    })
    if (existing) throw new Error('You have already responded to this review')

    const response = await prisma.reviewResponse.create({
      data: { ratingId, userId, content: body.content.trim() },
      include: { user: { select: { id: true, name: true, image: true } } }
    })

    return response
  })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { userId } = await requireAuth()
    const { id: ratingId } = await context.params

    const response = await prisma.reviewResponse.findUnique({
      where: { ratingId_userId: { ratingId, userId } }
    })
    if (!response) throw new Error('Response not found')

    await prisma.reviewResponse.delete({ where: { id: response.id } })
    return { deleted: true }
  })
}
