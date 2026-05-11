import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''

  if (!q || q.length < 1) {
    return NextResponse.json({ users: [] })
  }

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { startsWith: q, mode: 'insensitive' } },
        { name: { startsWith: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
    },
    take: 8,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ users })
}
