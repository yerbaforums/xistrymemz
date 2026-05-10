import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: groupId, postId } = await params
    const { liked } = await request.json()

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: session.user.id } }
    })
    if (!member) {
      return NextResponse.json({ error: 'Must be a member' }, { status: 403 })
    }

    const post = await prisma.groupPost.findUnique({ where: { id: postId } })
    if (!post || post.groupId !== groupId) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const updated = await prisma.groupPost.update({
      where: { id: postId },
      data: { likes: liked ? post.likes + 1 : Math.max(0, post.likes - 1) }
    })

    return NextResponse.json({ likes: updated.likes })
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
  }
}
