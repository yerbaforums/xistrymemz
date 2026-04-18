import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: planId } = await params
  
  const updates = await prisma.planUpdate.findMany({
    where: { planId },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(updates)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: planId } = await params
  const body = await request.json()
  const { content, imageUrl } = body

  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 })
  }

  const plan = await prisma.plan.findFirst({
    where: { id: planId }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const isOwner = plan.userId === session.user.id
  const isEditor = await prisma.planEditor.findFirst({
    where: { planId, userId: session.user.id }
  })

  if (!isOwner && !isEditor) {
    return NextResponse.json({ error: 'Not authorized to post updates' }, { status: 403 })
  }

  const update = await prisma.planUpdate.create({
    data: {
      content,
      imageUrl: imageUrl || null,
      userId: session.user.id,
      planId
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true }
      }
    }
  })

  return NextResponse.json(update)
}
