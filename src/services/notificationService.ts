import { prisma } from '@/lib/prisma'
import { shouldNotify } from '@/services/preferenceService'

type NotificationType = 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'NEW_MESSAGE'
  | 'PROJECT_UPDATE' | 'EVENT_REMINDER' | 'REQUEST_FULFILLED' | 'NEW_FOLLOWER'
  | 'MENTION' | 'LIKE' | 'COMMENT' | 'SYSTEM'
  | 'TICKET_PAID'
  | 'APPOINTMENT_REQUEST' | 'APPOINTMENT_CONFIRMED' | 'APPOINTMENT_DECLINED'
  | 'APPOINTMENT_RESCHEDULED' | 'APPOINTMENT_PAID' | 'APPOINTMENT_COMPLETED'
  | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_WITHDRAWN'
  | 'OFFER_COUNTERED'
  | 'OFFER_COMPLETED' | 'ORDER_UPDATE' | 'ORDER_CREATED'
  | 'SPONSORSHIP_REMINDER' | 'SPONSORSHIP_RECEIVED'
  | 'BLOG_PUBLISHED' | 'SCHOOL_PUBLISHED'

export async function createNotification(params: {
  type: NotificationType
  userId: string
  title?: string
  actorId?: string
  entityId?: string
  entityType?: string
  message: string
  link?: string
}) {
  const enabled = await shouldNotify(params.userId, params.type)
  if (!enabled) return null

  return prisma.notification.create({
    data: {
      type: params.type,
      userId: params.userId,
      title: params.title ?? params.type,
      message: params.message,
      link: params.link || null,
      relatedId: params.entityId ?? params.actorId ?? null,
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
