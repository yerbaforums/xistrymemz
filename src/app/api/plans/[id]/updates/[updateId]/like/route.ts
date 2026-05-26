import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { updateId } = await params

  const existing = await prisma.planUpdateLike.findUnique({
    where: { planUpdateId_userId: { planUpdateId: updateId, userId: session.user.id } }
  })

  if (existing) {
    await prisma.planUpdateLike.delete({ where: { id: existing.id } })
    await prisma.planUpdate.update({ where: { id: updateId }, data: { likes: { decrement: 1 } } })
    return NextResponse.json({ liked: false })
  }

  await prisma.planUpdateLike.create({ data: { planUpdateId: updateId, userId: session.user.id } })
  await prisma.planUpdate.update({ where: { id: updateId }, data: { likes: { increment: 1 } } })
  return NextResponse.json({ liked: true })
}
