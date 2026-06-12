import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pollVoteSchema, validateBody } from '@/lib/schemas'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    let body
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const validation = validateBody(pollVoteSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { postId, optionId } = validation.data
    const userId = session.user.id

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: { pollOptions: true }
    })

    if (!post || !post.isPoll) {
      return apiError("Poll not found", 404)
    }

    const validOption = post.pollOptions.find(o => o.id === optionId)
    if (!validOption) {
      return apiError("Invalid option", 400)
    }

    if (post.pollType === 'single') {
      const existingVote = await prisma.forumPollVote.findUnique({
        where: { userId_postId: { userId, postId } }
      })

      if (existingVote) {
        if (existingVote.optionId !== optionId) {
          await prisma.$transaction([
            prisma.forumPollOption.update({
              where: { id: existingVote.optionId },
              data: { voteCount: { decrement: 1 } }
            }),
            prisma.forumPollVote.delete({
              where: { id: existingVote.id }
            }),
            prisma.forumPollOption.update({
              where: { id: optionId },
              data: { voteCount: { increment: 1 } }
            }),
            prisma.forumPollVote.create({
              data: { userId, postId, optionId }
            })
          ])
        }
      } else {
        await prisma.$transaction([
          prisma.forumPollOption.update({
            where: { id: optionId },
            data: { voteCount: { increment: 1 } }
          }),
          prisma.forumPollVote.create({
            data: { userId, postId, optionId }
          })
        ])
      }
    } else {
      const existingVote = await prisma.forumPollVote.findFirst({
        where: { userId, postId, optionId }
      })

      if (existingVote) {
        return apiError("Already voted for this option", 400)
      }

      await prisma.$transaction([
        prisma.forumPollOption.update({
          where: { id: optionId },
          data: { voteCount: { increment: 1 } }
        }),
        prisma.forumPollVote.create({
          data: { userId, postId, optionId }
        })
      ])
    }

    const pollOptions = await prisma.forumPollOption.findMany({
      where: { postId },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({ success: true, pollOptions })
  } catch (error) {
    console.error('Error voting on poll:', error)
    return apiError("Failed to vote", 500)
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    let body
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const validation = validateBody(pollVoteSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { postId, optionId } = validation.data
    const userId = session.user.id

    const existingVote = await prisma.forumPollVote.findFirst({
      where: { userId, postId, optionId }
    })

    if (!existingVote) {
      return apiError("Vote not found", 404)
    }

    await prisma.$transaction([
      prisma.forumPollOption.update({
        where: { id: optionId },
        data: { voteCount: { decrement: 1 } }
      }),
      prisma.forumPollVote.delete({
        where: { id: existingVote.id }
      })
    ])

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error removing vote:', error)
    return apiError("Failed to remove vote", 500)
  }
}