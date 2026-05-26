import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await prisma.schoolContentLike.findUnique({
    where: { contentId_userId: { contentId: id, userId: session.user.id } }
  })

  if (existing) {
    await prisma.schoolContentLike.delete({ where: { id: existing.id } })
    return NextResponse.json({ liked: false })
  }

  await prisma.schoolContentLike.create({ data: { contentId: id, userId: session.user.id } })
  return NextResponse.json({ liked: true })
}
