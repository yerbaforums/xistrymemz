import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, postId } = await params

    const post = await prisma.groupPost.findUnique({ where: { id: postId } })
    if (!post || post.groupId !== groupId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } }
    })
    if (!member || (post.userId !== session.user.id && member.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.groupPost.delete({ where: { id: postId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting group post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
