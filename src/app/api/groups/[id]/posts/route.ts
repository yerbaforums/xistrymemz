import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseMentions } from '@/lib/mentions'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params

  const posts = await prisma.groupPost.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, image: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return apiSuccess(posts)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: groupId } = await params
  const { content, imageUrl } = await request.json()

  if (!content?.trim()) {
    return apiError("Content is required", 400)
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } }
  })

  if (!member) {
    return apiError("Must be a member to post", 403)
  }

  const post = await prisma.groupPost.create({
    data: {
      content: content.trim(),
      imageUrl,
      userId: session.user.id,
      groupId
    },
    include: {
      user: { select: { id: true, name: true, image: true } }
    }
  })

  // Extract and process mentions
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
            message: `${session.user.name || 'Someone'} mentioned you in a group post`,
            link: `/groups/${groupId}`,
            relatedId: post.id
          }))
      })
    }
  }

  // Extract and process hashtags
  const hashtags = extractHashtags(content)
  if (hashtags.length > 0) {
    await linkHashtags('GROUPPOST', post.id, hashtags)
    await prisma.hashtag.updateMany({
      where: { tag: { in: hashtags } },
      data: { postCount: { increment: 1 } },
    })
  }

  return apiSuccess(post)
}
