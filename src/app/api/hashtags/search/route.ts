import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''

  if (!query || query.length < 1) {
    return NextResponse.json({ hashtags: [] })
  }

  try {
    const hashtags = await prisma.hashtag.findMany({
      where: { tag: { contains: query.toLowerCase() } },
      orderBy: { postCount: 'desc' },
      take: 10,
      select: { tag: true, postCount: true }
    })

    return NextResponse.json({ hashtags })
  } catch {
    return NextResponse.json({ hashtags: [] })
  }
}
