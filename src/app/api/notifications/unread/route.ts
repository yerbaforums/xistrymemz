import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: session.user.id, read: false }
    })

    return apiSuccess({ unreadCount })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return apiError("Failed to fetch unread count", 500)
  }
}