import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ConversationEntry {
  userId: string
  user: { id: string; name: string | null; image: string | null; location: string | null }
  lastMessage: { id: string; content: string; createdAt: Date }
  unreadCount: number
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const sentMessages = await prisma.message.findMany({
      where: { senderId: session.user.id },
      include: {
        receiver: {
          select: { id: true, name: true, image: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const receivedMessages = await prisma.message.findMany({
      where: { receiverId: session.user.id },
      include: {
        sender: {
          select: { id: true, name: true, image: true, location: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const conversationsMap = new Map<string, ConversationEntry>()

    for (const msg of sentMessages) {
      const userId = msg.receiverId
      if (!conversationsMap.has(userId)) {
        conversationsMap.set(userId, {
          userId,
          user: msg.receiver,
          lastMessage: { id: msg.id, content: msg.content, createdAt: msg.createdAt },
          unreadCount: 0
        })
      } else {
        const conv = conversationsMap.get(userId)!
        if (msg.createdAt > conv.lastMessage.createdAt) {
          conv.lastMessage = { id: msg.id, content: msg.content, createdAt: msg.createdAt }
        }
      }
    }

    for (const msg of receivedMessages) {
      const userId = msg.senderId
      if (!conversationsMap.has(userId)) {
        conversationsMap.set(userId, {
          userId,
          user: msg.sender,
          lastMessage: { id: msg.id, content: msg.content, createdAt: msg.createdAt },
          unreadCount: msg.read ? 0 : 1
        })
      } else {
        const conv = conversationsMap.get(userId)!
        if (!msg.read) {
          conv.unreadCount += 1
        }
        if (msg.createdAt > conv.lastMessage.createdAt) {
          conv.lastMessage = { id: msg.id, content: msg.content, createdAt: msg.createdAt }
        }
      }
    }

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime())

    return apiSuccess({ conversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return apiError("Failed to fetch conversations", 500)
  }
}
