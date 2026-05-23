import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = await prisma.serviceOffering.findMany({
      where: { userId: session.user.id },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Error fetching user services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}
