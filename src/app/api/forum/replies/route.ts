import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { replySchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const side = searchParams.get('side') // PRO | CON | NEUTRAL
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50)
    const skip = (page - 1) * limit

    if (!postId) {
      return apiError("Post ID required", 400)
    }

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { postType: true }
    })

    const where: Record<string, unknown> = { postId }
    if (post?.postType === 'DEBATE' && side) {
      where.side = side
    }

    const replies = await prisma.forumReply.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      skip,
      take: limit
    })

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    let myReplyVotes: { replyId: string; value: number }[] = []
    if (userId && replies.length > 0) {
      myReplyVotes = await prisma.forumReplyVote.findMany({
        where: { voterId: userId, replyId: { in: replies.map(r => r.id) } },
        select: { replyId: true, value: true }
      })
    }
    const myVoteMap = new Map(myReplyVotes.map(v => [v.replyId, v.value]))

    const repliesWithMeta = replies.map(r => ({
      ...r,
      myVote: myVoteMap.get(r.id) || 0
    }))

    return apiSuccess(repliesWithMeta)
  } catch (error) {
    console.error('Error fetching replies:', error)
    return apiError("Failed to fetch replies", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const validation = validateBody(replySchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { content, postId, side } = validation.data

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { locked: true, postType: true }
    })

    if (!post) {
      return apiError("Post not found", 404)
    }
    if (post.locked) {
      return apiError("This thread is locked", 403)
    }

    const reply = await prisma.forumReply.create({
      data: {
        content,
        postId,
        authorId: session.user.id,
        side: post.postType === 'DEBATE' ? (side || 'NEUTRAL') : 'NEUTRAL'
      },
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      }
    })

    await prisma.forumPost.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } }
    })

    // Process mentions
    const mentionedUsernames = parseMentions(content)
    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: mentionedUsernames } },
        select: { id: true, username: true }
      })
      if (mentionedUsers.length > 0) {
        await prisma.notification.createMany({
          data: mentionedUsers
            .filter(u => u.id !== session.user.id)
            .map(u => ({
              userId: u.id,
              type: 'MENTION',
              title: 'New Mention',
              message: `${session.user.name || 'Someone'} mentioned you in a forum reply`,
              link: `/community/forum/${postId}`,
              relatedId: reply.id
            }))
        })
      }
    }

    return apiSuccess({ ...reply, myVote: 0 })
  } catch (error) {
    console.error('Error creating reply:', error)
    return apiError("Failed to create reply", 500)
  }
}