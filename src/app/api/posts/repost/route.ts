import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    const repost = await prisma.postRepost.findFirst({
      where: { userId: session.user.id, originalPostId: postId },
      select: { postId: true },
    })

    if (!repost) {
      return NextResponse.json({ error: 'Repost not found' }, { status: 404 })
    }

    await prisma.post.delete({ where: { id: repost.postId } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove repost' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 })
    }

    const original = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    })

    if (!original) {
      return NextResponse.json({ error: 'Original post not found' }, { status: 404 })
    }

    const post = await prisma.post.create({
      data: {
        content: '',
        userId: session.user.id,
        context: 'REPOST',
        referenceType: 'POST',
        referenceId: postId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })

    await prisma.postRepost.create({
      data: {
        userId: session.user.id,
        postId: post.id,
        originalPostId: postId,
      },
    })

    return NextResponse.json({ post }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to repost' }, { status: 500 })
  }
}
