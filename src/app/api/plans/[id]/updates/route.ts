import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const updates = await prisma.planUpdate.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likesRelation: true, comments: true } }
    }
  })
  return NextResponse.json(updates)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: planId } = await params
  const body = await request.json()
  const { content, imageUrl, images } = body

  if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: session.user.id }
  })
  if (!plan) return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 })

  const update = await prisma.planUpdate.create({
    data: {
      content: content.trim(),
      imageUrl: imageUrl || null,
      images: images || null,
      userId: session.user.id,
      planId
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likesRelation: true, comments: true } }
    }
  })

  return NextResponse.json(update)
}
