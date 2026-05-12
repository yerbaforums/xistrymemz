import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseMentions } from '@/lib/mentions'
import { extractHashtags } from '@/lib/hashtags'

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

  return NextResponse.json(posts)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: groupId } = await params
  const { content, imageUrl } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } }
  })

  if (!member) {
    return NextResponse.json({ error: 'Must be a member to post' }, { status: 403 })
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
  for (const tag of hashtags) {
    await prisma.hashtag.upsert({
      where: { tag },
      update: { postCount: { increment: 1 } },
      create: { tag, postCount: 1 }
    })
    await prisma.postHashtag.create({
      data: {
        postId: post.id,
        hashtagId: (await prisma.hashtag.findUnique({ where: { tag } }))!.id,
        sourceType: 'GROUPPOST'
      }
    }).catch(() => {})
  }

  return NextResponse.json(post)
}
