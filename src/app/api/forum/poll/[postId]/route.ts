import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        pollOptions: {
          orderBy: { sortOrder: 'asc' }
        },
        author: { select: { id: true, name: true, image: true } }
      }
    })

    if (!post || !post.isPoll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const totalVotes = post.pollOptions.reduce((sum, opt) => sum + opt.voteCount, 0)

    let userVoted = false
    let userVotes: string[] = []

    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      const votes = await prisma.forumPollVote.findMany({
        where: { postId, userId: session.user.id }
      })
      userVoted = votes.length > 0
      userVotes = votes.map(v => v.optionId)
    }

    const pollOptions = post.pollOptions.map(opt => ({
      ...opt,
      percentage: totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
    }))

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        pollType: post.pollType,
        pollEndsAt: post.pollEndsAt,
        author: post.author,
        createdAt: post.createdAt
      },
      pollOptions,
      totalVotes,
      userVoted,
      userVotes,
      isExpired: post.pollEndsAt ? new Date(post.pollEndsAt) < new Date() : false
    })
  } catch (error) {
    console.error('Error fetching poll:', error)
    return NextResponse.json({ error: 'Failed to fetch poll' }, { status: 500 })
  }
}