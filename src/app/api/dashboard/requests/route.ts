import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requests = await prisma.request.findMany({
      where: { userId: session.user.id },
      include: { 
        user: { select: { name: true, email: true } }, 
        plan: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        schoolContent: { select: { id: true, title: true } },
        event: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}