import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPin } from '@/lib/boardService'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = await params

  try {
    const board = await prisma.bulletinBoard.findUnique({ where: { slug } })
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, content, images, entityType, entityId, entityTitle, entityImage, contactName, contactEmail, contactPhone, category, expiresAt } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const pin = await createPin({
      boardId: board.id,
      userId: session.user.id,
      title,
      content,
      images,
      entityType,
      entityId,
      entityTitle,
      entityImage,
      contactName,
      contactEmail,
      contactPhone,
      category,
      expiresAt,
    })

    return NextResponse.json(pin, { status: 201 })
  } catch (error) {
    console.error('POST /api/boards/[slug]/pins:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
