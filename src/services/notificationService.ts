import { prisma } from '@/lib/prisma'

type NotificationType = 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'NEW_MESSAGE'
  | 'PLAN_UPDATE' | 'EVENT_REMINDER' | 'REQUEST_FULFILLED' | 'NEW_FOLLOWER'
  | 'MENTION' | 'LIKE' | 'COMMENT' | 'SYSTEM'
  | 'TICKET_PAID'

export async function createNotification(params: {
  type: NotificationType
  userId: string
  actorId?: string
  entityId?: string
  entityType?: string
  message: string
  link?: string
}) {
  return prisma.notification.create({
    data: {
      type: params.type,
      userId: params.userId,
      actorId: params.actorId || null,
      entityId: params.entityId || null,
      entityType: params.entityType || null,
      message: params.message,
      link: params.link || null,
    },
  })
}

export async function findNotifications(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
  const { page = 1, limit = 20, unreadOnly } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { userId }
  if (unreadOnly) where.read = false

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: { actor: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])

  return { notifications, total, unreadCount, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  })
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

export async function deleteNotification(id: string, userId: string) {
  await prisma.notification.deleteMany({ where: { id, userId } })
  return { deleted: true }
}
