import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { forumPostSchema, validateBody } from '@/lib/schemas'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = categoryId ? { categoryId } : {}

    const posts = await prisma.forumPost.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, username: true, email: true, image: true, shopSlug: true } },
        category: { select: { id: true, name: true, slug: true } },
        pollOptions: { select: { id: true, optionText: true, voteCount: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
        _count: { select: { replies: true } }
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset
    })

    const postsWithMeta = posts.map(p => ({
      ...p,
      viewCount: p.viewCount || 0,
      replyCount: p._count?.replies || 0,
      totalVotes: p.pollOptions.reduce((sum, opt) => sum + opt.voteCount, 0) || 0
    }))

    return NextResponse.json(postsWithMeta)
  } catch (error) {
    console.error('Error fetching forum posts:', error)
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validation = validateBody(forumPostSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, content, categoryId, isPoll, pollType, pollEndsAt, pollOptions } = validation.data

    if (!categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 })
    }

    const post = await prisma.forumPost.create({
      data: {
        title,
        content,
        categoryId,
        authorId: session.user.id,
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

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error creating forum post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}