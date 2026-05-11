import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const saved = await prisma.savedItem.findUnique({
    where: { id },
    select: { userId: true }
  })

  if (!saved) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (saved.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.savedItem.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
