import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params

  const posts = await prisma.groupPost.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, name: true, image: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(posts)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: groupId } = await params
  const { content, imageUrl } = await request.json()

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id } }
  })

  if (!member) {
    return NextResponse.json({ error: 'Must be a member to post' }, { status: 403 })
  }

  const post = await prisma.groupPost.create({
    data: {
      content: content.trim(),
      imageUrl,
      userId: session.user.id,
      groupId
    },
    include: {
      user: { select: { id: true, name: true, image: true } }
    }
  })

  return NextResponse.json(post)
}
