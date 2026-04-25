import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
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
            planId: true,
            groupId: true
          }
        }
      }
    })

    return NextResponse.json(joinedEvents)
  } catch (error) {
    console.error('Error fetching joined events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}