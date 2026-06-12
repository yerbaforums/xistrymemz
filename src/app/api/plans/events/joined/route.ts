import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
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

    return apiSuccess(joinedEvents)
  } catch (error) {
    console.error('Error fetching joined events:', error)
    return apiError("Failed to fetch events", 500)
  }
}