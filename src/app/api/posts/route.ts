import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postSchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'
import { extractHashtags } from '@/lib/hashtags'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetUserId = searchParams.get('targetUserId')
    const tag = searchParams.get('tag')
    const context = searchParams.get('context')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (tag) {
      const hashtag = await prisma.hashtag.findUnique({ where: { tag: tag.toLowerCase() } })
      if (hashtag) {
        const postHashtags = await prisma.postHashtag.findMany({
          where: { hashtagId: hashtag.id, sourceType: 'POST' },
          select: { postId: true },
          take: limit,
          skip: offset
        })
        const postIds = postHashtags.map(ph => ph.postId)
        where.id = { in: postIds }
      } else {
        return NextResponse.json({ posts: [], total: 0 })
      }
    } else if (targetUserId) {
      where.OR = [
        { userId: targetUserId, targetUserId: null },
        { targetUserId: targetUserId }
      ]
    } else if (userId) {
      where.userId = userId
      where.targetUserId = null
    }

    if (context) {
      where.context = context
    } else if (targetUserId || userId) {
      where.NOT = { context: { in: ['SHOP' as string, 'SCHOOL' as string] } }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true
            }
          }
        },
        orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset
      }),
      prisma.post.count({ where })
    ])

    return NextResponse.json({ posts, total })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateBody(postSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { content, imageUrl, images, targetUserId, context } = validation.data

    const isWallPost = targetUserId && targetUserId !== session.user.id

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        imageUrl: imageUrl || null,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        userId: session.user.id,
        targetUserId: isWallPost ? targetUserId : null,
        context: context || 'PROFILE',
        pinned: false
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true
          }
        }
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
        const mentionIds = mentionedUsers.map(u => u.id)
        await prisma.post.update({
          where: { id: post.id },
          data: { mentions: JSON.stringify(mentionIds) }
        })
        // Create notifications for mentioned users
        await prisma.notification.createMany({
          data: mentionedUsers
            .filter(u => u.id !== session.user.id)
            .map(u => ({
              userId: u.id,
              type: 'MENTION',
              title: 'New Mention',
              message: `${session.user.name || 'Someone'} mentioned you in a post`,
              link: `/profile/${(session.user as any).username || session.user.id}`,
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
          sourceType: 'POST'
        }
      }).catch(() => {})
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
