import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const { name } = body

    const room = await prisma.videoRoom.create({
      data: {
        name: name || `${session.user.name || 'User'}'s Room`,
        createdById: session.user.id,
        participants: {
          create: { userId: session.user.id },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    })

    return apiSuccess({ room })
  } catch (error) {
    console.error('Error creating video room:', error)
    return apiError("Failed to create room", 500)
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const rooms = await prisma.videoRoom.findMany({
      where: {
        isActive: true,
        participants: { some: { userId: session.user.id, leftAt: null } },
      },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return apiSuccess({ rooms })
  } catch (error) {
    console.error('Error fetching video rooms:', error)
    return apiError("Failed to fetch rooms", 500)
  }
}
