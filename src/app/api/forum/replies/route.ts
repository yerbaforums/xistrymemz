import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { replySchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const replies = await prisma.forumReply.findMany({
      where: { postId },
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(replies)
  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateBody(replySchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { content, postId } = validation.data

    const reply = await prisma.forumReply.create({
      data: {
        content,
        postId,
        authorId: session.user.id
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

    return NextResponse.json(reply)
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 })
  }
}