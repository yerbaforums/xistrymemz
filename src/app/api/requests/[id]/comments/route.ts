import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const comments = await prisma.comment.findMany({
    where: { requestId: id },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return NextResponse.json(comments)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { content } = body

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const req = await prisma.request.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { plan: { userId: session.user.id } }
      ]
    }
  })

  if (!req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      userId: session.user.id,
      requestId: id
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  return NextResponse.json(comment)
}
