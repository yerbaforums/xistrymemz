import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const where: Record<string, unknown> = { userId: session.user.id }
  if (type) where.type = type

  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(products)
}
