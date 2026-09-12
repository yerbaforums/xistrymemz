import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { forumVoteSchema, forumVoteDeleteSchema, validateBody } from '@/lib/schemas'

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

    const validation = validateBody(forumVoteSchema, body)
    if (!validation.success) {
      return apiError(validation.error, 400)
    }

    const { postId, value } = validation.data
    const userId = session.user.id

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true }
    })
    if (!post) {
      return apiError("Post not found", 404)
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.forumVote.findUnique({
        where: { voterId_postId: { voterId: userId, postId } }
      })

      if (!existing) {
        await tx.forumVote.create({
          data: { voterId: userId, postId, value }
        })
        await tx.forumPost.update({
          where: { id: postId },
          data: { score: { increment: value } }
        })
      } else if (existing.value !== value) {
        await tx.forumVote.update({
          where: { id: existing.id },
          data: { value }
        })
        await tx.forumPost.update({
          where: { id: postId },
          data: { score: { increment: value - existing.value } }
        })
      }
    })

    const postWithScore = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { score: true }
    })

    return apiSuccess({ score: postWithScore?.score || 0 })
  } catch (error) {
    console.error('Error voting on post:', error)
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

    const validation = validateBody(forumVoteDeleteSchema, body)
    if (!validation.success) {
      return apiError(validation.error, 400)
    }

    const { postId } = validation.data
    const userId = session.user.id

    const existing = await prisma.forumVote.findUnique({
      where: { voterId_postId: { voterId: userId, postId } }
    })
    if (!existing) {
      return apiError("Vote not found", 404)
    }

    await prisma.$transaction([
      prisma.forumVote.delete({ where: { id: existing.id } }),
      prisma.forumPost.update({
        where: { id: postId },
        data: { score: { decrement: existing.value } }
      })
    ])

    const postWithScore = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { score: true }
    })

    return apiSuccess({ score: postWithScore?.score || 0 })
  } catch (error) {
    console.error('Error removing vote:', error)
    return apiServerError(error)
  }
}