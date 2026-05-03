import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, email: true, image: true, shopSlug: true } },
        category: { select: { id: true, name: true, slug: true } },
        pollOptions: { 
          select: { id: true, optionText: true, voteCount: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    await prisma.forumPost.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } }
    })

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error fetching post:', error)
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId } = await params
  const body = await request.json()
  const { title, content, categoryId } = body

  const existingPost = await prisma.forumPost.findUnique({
    where: { id: postId }
  })

  if (!existingPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Check if user is author or admin
  const isAuthor = existingPost.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.forumPost.update({
    where: { id: postId },
    data: {
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(categoryId && { categoryId })
    }
  })

  return NextResponse.json(updated)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
  }

  const { postId } = await params
  const body = await request.json()
  const { pinned, locked } = body

  const existingPost = await prisma.forumPost.findUnique({
    where: { id: postId }
  })

  if (!existingPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const updated = await prisma.forumPost.update({
    where: { id: postId },
    data: {
      ...(pinned !== undefined && { pinned }),
      ...(locked !== undefined && { locked })
    }
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { postId } = await params

  const existingPost = await prisma.forumPost.findUnique({
    where: { id: postId },
    include: {
      replies: { select: { id: true } }
    }
  })

  if (!existingPost) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Check if user is author or admin
  const isAuthor = existingPost.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete associated replies first
  await prisma.forumReply.deleteMany({
    where: { postId }
  })

  // Delete tips
  await prisma.forumPostTip.deleteMany({
    where: { postId }
  })

  // Delete post
  await prisma.forumPost.delete({
    where: { id: postId }
  })

  return NextResponse.json({ success: true })
}