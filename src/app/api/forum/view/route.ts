import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, replyId, type } = body

    if (type === 'post' && postId) {
      await prisma.forumPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } }
      })
      return NextResponse.json({ success: true })
    }

    if (type === 'reply' && replyId) {
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  } catch (error) {
    console.error('Error tracking view:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}