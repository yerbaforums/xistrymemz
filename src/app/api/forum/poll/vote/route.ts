import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pollVoteSchema, validateBody } from '@/lib/schemas'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
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
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const validOption = post.pollOptions.find(o => o.id === optionId)
    if (!validOption) {
      return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
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
        return NextResponse.json({ error: 'Already voted for this option' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
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
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
  }
}