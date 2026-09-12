import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { forumReplyVoteSchema, forumReplyVoteDeleteSchema, validateBody } from '@/lib/schemas'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiUnauthorized()
    }

    let body
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const validation = validateBody(forumReplyVoteSchema, body)
    if (!validation.success) {
      return apiError(validation.error, 400)
    }

    const { replyId, value } = validation.data
    const userId = session.user.id

    const reply = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true }
    })
    if (!reply) {
      return apiError("Reply not found", 404)
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.forumReplyVote.findUnique({
        where: { voterId_replyId: { voterId: userId, replyId } }
      })

      if (!existing) {
        await tx.forumReplyVote.create({
          data: { voterId: userId, replyId, value }
        })
        await tx.forumReply.update({
          where: { id: replyId },
          data: { score: { increment: value } }
        })
      } else if (existing.value !== value) {
        await tx.forumReplyVote.update({
          where: { id: existing.id },
          data: { value }
        })
        await tx.forumReply.update({
          where: { id: replyId },
          data: { score: { increment: value - existing.value } }
        })
      }
    })

    const replyWithScore = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { score: true }
    })

    return apiSuccess({ score: replyWithScore?.score || 0 })
  } catch (error) {
    console.error('Error voting on reply:', error)
    return apiServerError(error)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiUnauthorized()
    }

    let body
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const validation = validateBody(forumReplyVoteDeleteSchema, body)
    if (!validation.success) {
      return apiError(validation.error, 400)
    }

    const { replyId } = validation.data
    const userId = session.user.id

    const existing = await prisma.forumReplyVote.findUnique({
      where: { voterId_replyId: { voterId: userId, replyId } }
    })
    if (!existing) {
      return apiError("Vote not found", 404)
    }

    await prisma.$transaction([
      prisma.forumReplyVote.delete({ where: { id: existing.id } }),
      prisma.forumReply.update({
        where: { id: replyId },
        data: { score: { decrement: existing.value } }
      })
    ])

    const replyWithScore = await prisma.forumReply.findUnique({
      where: { id: replyId },
      select: { score: true }
    })

    return apiSuccess({ score: replyWithScore?.score || 0 })
  } catch (error) {
    console.error('Error removing reply vote:', error)
    return apiServerError(error)
  }
}