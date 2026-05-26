import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const { updateId } = await params
  const comments = await prisma.planUpdateComment.findMany({
    where: { planUpdateId: updateId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, image: true } } }
  })
  return NextResponse.json(comments)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { updateId } = await params
  const body = await request.json()
  if (!body.content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  const comment = await prisma.planUpdateComment.create({
    data: { content: body.content.trim(), planUpdateId: updateId, userId: session.user.id },
    include: { user: { select: { id: true, name: true, image: true } } }
  })
  return NextResponse.json(comment)
}
