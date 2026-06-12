import { apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { replySchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

    if (!postId) {
      return apiError("Post ID required", 400)
    }

    const replies = await prisma.forumReply.findMany({ skip, take: limit,
      where: { postId },
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } }
      },
      skip,
        take: limit,
        orderBy: { createdAt: 'asc' }
    })

    return apiSuccess(replies)
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

    return apiSuccess(reply)
  } catch (error) {
    console.error('Error creating reply:', error)
    return apiError("Failed to create reply", 500)
  }
}