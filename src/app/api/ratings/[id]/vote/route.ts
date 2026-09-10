import { apiSuccess, apiError, handleApi, requireAuth } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleApi(async () => {
    const { userId } = await requireAuth()
    const { id: ratingId } = await context.params

    const rating = await prisma.rating.findUnique({ where: { id: ratingId } })
    if (!rating) throw new Error('Rating not found')

    const existing = await prisma.reviewVote.findUnique({
      where: { ratingId_userId: { ratingId, userId } }
    })

    if (existing) {
      await prisma.reviewVote.delete({ where: { id: existing.id } })
    } else {
      await prisma.reviewVote.create({
        data: { ratingId, userId, helpful: true }
      })
    }

    const voteCount = await prisma.reviewVote.count({ where: { ratingId } })
    const userVoted = !existing

    return { voteCount, userVoted }
  })
}
