import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'pending'

    const where = {} as Record<string, unknown>
    
    if (filter === 'pending') {
      where.receiverId = session.user.id
      where.status = 'PENDING'
    } else if (filter === 'sent') {
      where.requesterId = session.user.id
      where.status = 'PENDING'
    } else if (filter === 'accepted') {
      where.OR = [
        { requesterId: session.user.id, status: 'ACCEPTED' },
        { receiverId: session.user.id, status: 'ACCEPTED' }
      ]
    }

    const connections = await prisma.connection.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, image: true, earthId: true, verificationLevel: true, username: true } },
        receiver: { select: { id: true, name: true, image: true, earthId: true, verificationLevel: true, username: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(connections)
  } catch (error) {
    console.error('Error fetching connections:', error)
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
  }
}