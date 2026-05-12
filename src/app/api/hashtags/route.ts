import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const mode = searchParams.get('mode') || 'trending'
    const limit = parseInt(searchParams.get('limit') || '20')

    if (search) {
      const hashtags = await prisma.hashtag.findMany({
        where: { tag: { contains: search.toLowerCase(), mode: 'insensitive' } },
        orderBy: { postCount: 'desc' },
        take: limit
      })
      return NextResponse.json({ hashtags })
    }

    if (mode === 'trending') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const hashtags = await prisma.hashtag.findMany({
        where: {
          posts: {
            some: {
              createdAt: { gte: sevenDaysAgo }
            }
          }
        },
        orderBy: { postCount: 'desc' },
        take: limit
      })
      return NextResponse.json({ hashtags })
    }

    const hashtags = await prisma.hashtag.findMany({
      orderBy: { postCount: 'desc' },
      take: limit
    })
    return NextResponse.json({ hashtags })
  } catch (error) {
    console.error('Error fetching hashtags:', error)
    return NextResponse.json({ error: 'Failed to fetch hashtags' }, { status: 500 })
  }
}
