import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [replies, total] = await Promise.all([
      prisma.post.findMany({
        where: { parentId: id },
        include: {
          user: {
            select: { id: true, name: true, image: true, username: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      }),
      prisma.post.count({ where: { parentId: id } })
    ])

    return NextResponse.json({ replies, total })
  } catch (error) {
    console.error('Error fetching replies:', error)
    return NextResponse.json({ error: 'Failed to fetch replies' }, { status: 500 })
  }
}
