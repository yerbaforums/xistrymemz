import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'pending'
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const skip = (page - 1) * limit

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

    const connections = await prisma.connection.findMany({ skip, take: limit,
      where,
      include: {
        requester: { select: { id: true, name: true, image: true, earthId: true, verificationLevel: true, username: true } },
        receiver: { select: { id: true, name: true, image: true, earthId: true, verificationLevel: true, username: true } }
      },
      skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(connections)
  } catch (error) {
    console.error('Error fetching connections:', error)
    return apiError("Failed to fetch connections", 500)
  }
}