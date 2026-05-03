import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
        author: { select: { id: true, name: true, email: true, image: true, shopSlug: true } }
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
    const { content, postId } = body

    if (!content || !postId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const reply = await prisma.forumReply.create({
      data: {
        content,
        postId,
        authorId: session.user.id
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true, shopSlug: true } }
      }
    })

    await prisma.forumPost.update({
      where: { id: postId },
      data: { replyCount: { increment: 1 } }
    })

    return NextResponse.json(reply)
  } catch (error) {
    console.error('Error creating reply:', error)
    return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 })
  }
}