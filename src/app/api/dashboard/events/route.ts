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

    const joinedEvents = await prisma.eventJoiner.findMany({
      where: { userId: session.user.id },
      include: { 
        event: { 
          select: { 
            id: true, 
            title: true, 
            eventDate: true, 
            location: true, 
            planId: true,
            groupId: true
          } 
        } 
      },
      orderBy: { joinedAt: 'desc' },
      take: 20
    })

    return NextResponse.json(joinedEvents)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}