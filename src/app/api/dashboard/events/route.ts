import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
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
            location: true, 
            projectId: true,
            groupId: true
          } 
        } 
      },
      orderBy: { joinedAt: 'desc' },
      take: 20
    })

    return apiSuccess(joinedEvents)
  } catch (error) {
    console.error('Error fetching events:', error)
    return apiError("Failed to fetch events", 500)
  }
}