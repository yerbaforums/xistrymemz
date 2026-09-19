import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { forumPostSchema, validateBody } from '@/lib/schemas'
import { parseMentions } from '@/lib/mentions'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const categoryIds = searchParams.get('categoryIds')
    const authorId = searchParams.get('authorId')
    const postType = searchParams.get('postType')
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    const sortBy = searchParams.get('sortBy')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}
    if (categoryId) where.categoryId = categoryId
    else if (categoryIds) {
      const ids = categoryIds.split(',').map(s => s.trim()).filter(Boolean)
      if (ids.length > 0) where.categoryId = { in: ids }
    }
    if (authorId) where.authorId = authorId
    if (postType) where.postType = postType
    if (status) where.status = status
    if (q && q.trim().length >= 2) {
      const search = q.trim()
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ]
    }

    const orderBy: Record<string, unknown>[] = [{ pinned: 'desc' }]
    switch (sortBy) {
      case 'score':
        orderBy.push({ score: 'desc' }, { createdAt: 'desc' })
        break
      case 'oldest':
        orderBy.push({ createdAt: 'asc' })
        break
      case 'mostReplies':
        orderBy.push({ replyCount: 'desc' }, { createdAt: 'desc' })
        break
      case 'mostViews':
        orderBy.push({ viewCount: 'desc' }, { createdAt: 'desc' })
        break
      case 'mostTips':
        orderBy.push({ totalTips: 'desc' }, { createdAt: 'desc' })
        break
      default:
        orderBy.push({ createdAt: 'desc' })
    }

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } },
        category: { select: { id: true, name: true, slug: true } },
        pollOptions: { select: { id: true, optionText: true, voteCount: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { replies: true } }
      },
      orderBy,
      take: limit,
      skip: offset
    })

    const session = await getServerSession(authOptions)
    const myVotes = session?.user?.id
      ? await prisma.forumVote.findMany({
          where: { voterId: session.user.id, postId: { in: posts.map(p => p.id) } },
          select: { postId: true, value: true }
        })
      : []
    const myVoteMap = new Map(myVotes.map(v => [v.postId, v.value]))

    const postsWithMeta = posts.map(p => ({
      ...p,
      viewCount: p.viewCount || 0,
      replyCount: p._count?.replies || 0,
      totalVotes: p.pollOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0,
      totalTips: p.totalTips || 0,
      myVote: myVoteMap.get(p.id) || 0
    }))

    return apiSuccess(postsWithMeta)
  } catch (error) {
    console.error('Error fetching forum posts:', error)
    return apiError("Failed to fetch posts", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const validation = validateBody(forumPostSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, content, categoryId, postType, status, isPoll, pollType, pollEndsAt, pollOptions } = validation.data

    if (!categoryId) {
      return apiError("Category is required", 400)
    }

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        categoryId,
        authorId: session.user.id,
        postType: postType || 'GENERAL',
        status: status || 'NONE',
        isPoll: isPoll || false,
        pollType: pollType || 'single',
        pollEndsAt: pollEndsAt ? new Date(pollEndsAt) : null
      },
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } },
        category: { select: { id: true, name: true, slug: true } }
      }
    })

    if (isPoll && pollOptions && pollOptions.length >= 2) {
      await prisma.forumPollOption.createMany({
        data: pollOptions.map((optionText, index) => ({
          optionText,
          sortOrder: index,
          postId: post.id
        }))
      })
    }

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
              message: `${session.user.name || 'Someone'} mentioned you in a forum post`,
              link: `/community/forum/${post.id}`,
              relatedId: post.id
            }))
        })
      }
    }

    // Process hashtags
    const hashtags = extractHashtags(content)
    if (hashtags.length > 0) {
      await linkHashtags('FORUMPOST', post.id, hashtags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: hashtags } },
        data: { postCount: { increment: 1 } },
      })
    }

    return apiSuccess(post)
  } catch (error) {
    console.error('Error creating forum post:', error)
    return apiError("Failed to create post", 500)
  }
}