import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['POST','PRODUCT','SERVICE','EVENT','PLAN','REQUEST','SCHOOLCONTENT','GROUP','SHOP','FORUMPOST']

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { entityType, entityId, content } = await request.json()
    if (!entityType || !entityId || !content?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const type = entityType.toUpperCase()
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const reply = await prisma.entityReply.create({
      data: {
        userId: session.user.id,
        entityType: type,
        entityId,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Reply error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
