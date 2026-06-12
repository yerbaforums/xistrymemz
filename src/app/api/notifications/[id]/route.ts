import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const notification = await prisma.notification.findUnique({
      where: { id }
    })

    if (!notification) {
      return apiError("Notification not found", 404)
    }

    if (notification.userId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    return apiSuccess(notification)
  } catch (error) {
    console.error('Error fetching notification:', error)
    return apiError("Failed to fetch notification", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const existing = await prisma.notification.findUnique({
      where: { id }
    })

    if (!existing) {
      return apiError("Notification not found", 404)
    }

    if (existing.userId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating notification:', error)
    return apiError("Failed to update notification", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const existing = await prisma.notification.findUnique({
      where: { id }
    })

    if (!existing) {
      return apiError("Notification not found", 404)
    }

    if (existing.userId !== session.user.id) {
      return apiError("Not authorized", 403)
    }

    await prisma.notification.delete({
      where: { id }
    })

    return apiSuccess({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return apiError("Failed to delete notification", 500)
  }
}