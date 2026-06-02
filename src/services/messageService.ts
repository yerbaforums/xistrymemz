import { prisma } from '@/lib/prisma'

export async function getMessagesBetweenUsers(userId1: string, userId2: string) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
    },
    include: {
      sender: { select: { id: true, name: true, email: true, image: true } },
      receiver: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function markMessagesAsRead(senderId: string, receiverId: string) {
  await prisma.message.updateMany({
    where: { senderId, receiverId, read: false },
    data: { read: true },
  })
}

export async function sendMessage(senderId: string, receiverId: string, content: string) {
  return prisma.message.create({
    data: { senderId, receiverId, content },
    include: {
      sender: { select: { id: true, name: true, email: true, image: true } },
      receiver: { select: { id: true, name: true, email: true, image: true } },
    },
  })
}

export async function getConversationsForUser(userId: string) {
  const sent = await prisma.message.findMany({
    where: { senderId: userId },
    select: { receiverId: true },
    distinct: ['receiverId'],
  })
  const received = await prisma.message.findMany({
    where: { receiverId: userId },
    select: { senderId: true },
    distinct: ['senderId'],
  })

  const partnerIds = new Set([
    ...sent.map(m => m.receiverId),
    ...received.map(m => m.senderId),
  ])

  const conversations = await Promise.all(
    Array.from(partnerIds).map(async (partnerId) => {
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          receiver: { select: { id: true, name: true, image: true } },
        },
      })

      const unreadCount = await prisma.message.count({
        where: { senderId: partnerId, receiverId: userId, read: false },
      })

      const partner = await prisma.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, image: true, username: true },
      })

      return {
        id: partnerId,
        user: partner,
        lastMessage,
        unreadCount,
      }
    })
  )

  return conversations.sort((a, b) => {
    const dateA = a.lastMessage?.createdAt?.getTime() || 0
    const dateB = b.lastMessage?.createdAt?.getTime() || 0
    return dateB - dateA
  })
}
