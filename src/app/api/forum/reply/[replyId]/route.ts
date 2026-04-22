import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ replyId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { replyId } = await params
  const body = await request.json()
  const { content } = body

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const existingReply = await prisma.forumReply.findUnique({
    where: { id: replyId }
  })

  if (!existingReply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
  }

  // Check if user is author or admin
  const isAuthor = existingReply.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updated = await prisma.forumReply.update({
    where: { id: replyId },
    data: { content }
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ replyId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { replyId } = await params

  const existingReply = await prisma.forumReply.findUnique({
    where: { id: replyId }
  })

  if (!existingReply) {
    return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
  }

  // Check if user is author or admin
  const isAuthor = existingReply.authorId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Delete tips first
  await prisma.forumReplyTip.deleteMany({
    where: { replyId }
  })

  // Delete reply
  await prisma.forumReply.delete({
    where: { id: replyId }
  })

  // Decrement reply count on post
  await prisma.forumPost.update({
    where: { id: existingReply.postId },
    data: { replyCount: { decrement: 1 } }
  })

  return NextResponse.json({ success: true })
}
