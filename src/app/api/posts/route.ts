import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { postSchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'
import { sseManager } from '@/lib/sse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetUserId = searchParams.get('targetUserId')
    const tag = searchParams.get('tag')
    const context = searchParams.get('context')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = { parentId: null }

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
      where.context = { notIn: ['SHOP' as string, 'SCHOOL' as string] }
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

    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id

    const postIds = posts.map(p => p.id)

    const replyCounts = postIds.length > 0
      ? await prisma.post.groupBy({
          by: ['parentId'],
          where: { parentId: { in: postIds } },
          _count: { id: true },
        })
      : []
    const replyCountMap = new Map(replyCounts.map(r => [r.parentId, r._count.id]))

    const repostCounts = postIds.length > 0
      ? await prisma.postRepost.groupBy({
          by: ['originalPostId'],
          where: { originalPostId: { in: postIds } },
          _count: { id: true },
        })
      : []
    const repostCountMap = new Map(repostCounts.map(r => [r.originalPostId, r._count.id]))

    const userReposts = currentUserId && postIds.length > 0
      ? await prisma.postRepost.findMany({
          where: { userId: currentUserId, originalPostId: { in: postIds } },
          select: { originalPostId: true }
        })
      : []
    const repostedSet = new Set(userReposts.map(r => r.originalPostId))

    const enriched = posts.map(p => ({
      ...p,
      replyCount: replyCountMap.get(p.id) ?? 0,
      repostCount: repostCountMap.get(p.id) ?? 0,
      reposted: repostedSet.has(p.id),
    }))

    return NextResponse.json({ posts: enriched, total })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return apiError("Failed to fetch posts", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const validation = validateBody(postSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { content, imageUrl, images, targetUserId, context, parentId, referenceType, referenceId, referenceTitle } = validation.data

    if (!content?.trim() && !referenceType && !parentId) {
      return apiError("Content is required", 400)
    }

    const resolvedImageUrl = imageUrl || (images && images.length > 0 ? images[0] : null)

    const isWallPost = targetUserId && targetUserId !== session.user.id

    const post = await prisma.post.create({
      data: {
        content: content.trim(),
        imageUrl: resolvedImageUrl,
        images: images && images.length > 0 ? JSON.stringify(images) : null,
        userId: session.user.id,
        targetUserId: isWallPost ? targetUserId : null,
        context: context || 'PROFILE',
        parentId: parentId || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        referenceTitle: referenceTitle || null,
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
        // Real-time SSE push for each mentioned user
        mentionedUsers
          .filter(u => u.id !== session.user.id)
          .forEach(u => sseManager.emit(u.id, JSON.stringify({ type: 'notification' })))
      }
    }

    // Extract and process hashtags
    const hashtags = extractHashtags(content)
    if (hashtags.length > 0) {
      await linkHashtags('POST', post.id, hashtags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: hashtags } },
        data: { postCount: { increment: 1 } },
      })
    }

    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    return apiError("Failed to create post", 500)
  }
}
