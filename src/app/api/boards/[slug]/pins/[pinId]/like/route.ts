import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug, pinId } = await params

  try {
    const pin = await prisma.bulletinPin.findUnique({ where: { id: pinId } })
    if (!pin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    const existing = await prisma.pinLike.findUnique({
      where: { pinId_userId: { pinId, userId: session.user.id } },
    })

    if (existing) {
      await prisma.pinLike.delete({ where: { id: existing.id } })
      const count = await prisma.pinLike.count({ where: { pinId } })
      return NextResponse.json({ liked: false, count })
    }

    await prisma.pinLike.create({
      data: { pinId, userId: session.user.id },
    })
    const count = await prisma.pinLike.count({ where: { pinId } })
    return NextResponse.json({ liked: true, count })
  } catch (error) {
    console.error('POST like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const session = await getServerSession(authOptions)
  const { slug, pinId } = await params

  try {
    const [count, userLiked] = await Promise.all([
      prisma.pinLike.count({ where: { pinId } }),
      session?.user?.id
        ? prisma.pinLike.findUnique({ where: { pinId_userId: { pinId, userId: session.user.id } } })
            .then(r => !!r)
        : Promise.resolve(false),
    ])
    return NextResponse.json({ count, liked: userLiked })
  } catch (error) {
    console.error('GET like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
