import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
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

    const existing = await prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId: board.id, userId: session.user.id } },
    })

    if (existing) {
      await prisma.boardMember.delete({ where: { id: existing.id } })
      const count = await prisma.boardMember.count({ where: { boardId: board.id } })
      return NextResponse.json({ joined: false, memberCount: count })
    }

    await prisma.boardMember.create({
      data: { boardId: board.id, userId: session.user.id },
    })
    const count = await prisma.boardMember.count({ where: { boardId: board.id } })
    return NextResponse.json({ joined: true, memberCount: count })
  } catch (error) {
    console.error('POST join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions)
  const { slug } = await params

  try {
    const board = await prisma.bulletinBoard.findUnique({ where: { slug } })
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const [memberCount, joined] = await Promise.all([
      prisma.boardMember.count({ where: { boardId: board.id } }),
      session?.user?.id
        ? prisma.boardMember.findUnique({ where: { boardId_userId: { boardId: board.id, userId: session.user.id } } }).then(r => !!r)
        : Promise.resolve(false),
    ])

    return NextResponse.json({ memberCount, joined })
  } catch (error) {
    console.error('GET join:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
