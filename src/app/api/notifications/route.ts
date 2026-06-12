import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const where: Prisma.NotificationWhereInput = { userId: session.user.id }
    if (unreadOnly) {
      where.read = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return apiSuccess(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return apiError("Failed to fetch notifications", 500)
  }
}

export async function PUT(request: Request) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const markAllRead = searchParams.get('markAllRead') === 'true'

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true }
      })
      return apiSuccess({ message: 'All notifications marked as read' })
    }

    return apiError("Invalid request", 400)
  } catch (error) {
    console.error('Error updating notifications:', error)
    return apiError("Failed to update notifications", 500)
  }
}