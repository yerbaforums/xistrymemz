import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const links = await prisma.userLink.findMany({
      where: { userId: id },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({ links })
  } catch (error) {
    console.error('Error fetching user links:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}
