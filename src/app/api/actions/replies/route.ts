import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json({ replies: [] })
    }

    const replies = await prisma.entityReply.findMany({
      where: {
        entityType: entityType.toUpperCase(),
        entityId,
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ replies })
  } catch (error) {
    console.error('Fetch replies error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
