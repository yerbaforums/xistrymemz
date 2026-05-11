import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const saved = await prisma.savedItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      itemType: true,
      itemId: true,
      createdAt: true,
    }
  })

  return NextResponse.json({ saved })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { itemType, itemId } = body

    if (!itemType || !itemId) {
      return NextResponse.json({ error: 'itemType and itemId are required' }, { status: 400 })
    }

    const validTypes = ['PLAN', 'PRODUCT', 'REQUEST', 'EVENT', 'FORUM_POST']
    if (!validTypes.includes(itemType)) {
      return NextResponse.json({ error: `Invalid itemType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 })
    }

    const existing = await prisma.savedItem.findUnique({
      where: {
        userId_itemType_itemId: {
          userId: session.user.id,
          itemType,
          itemId,
        }
      }
    })

    if (existing) {
      return NextResponse.json({ saved: existing })
    }

    const saved = await prisma.savedItem.create({
      data: {
        userId: session.user.id,
        itemType,
        itemId,
      }
    })

    return NextResponse.json({ saved }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
