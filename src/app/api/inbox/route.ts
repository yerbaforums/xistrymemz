import { apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface InboxItem {
  id: string
  type: 'DM' | 'CONNECTION' | 'OFFER' | 'COLLAB'
  fromUser: { id: string; name: string | null; image: string | null }
  message: string | null
  status: string
  createdAt: string
  entity?: { type: string; id: string; title: string } | null
  actions: string[]
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const userId = session.user.id

  try {
    const [messages, connections, offers, collabRequests] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        include: {
          sender: { select: { id: true, name: true, image: true } },
          receiver: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.connection.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
        include: {
          requester: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.barterOffer.findMany({
        where: {
          receiverId: userId,
          status: { in: ['PENDING', 'COUNTERED'] },
        },
        include: {
          maker: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.collaborationRequest.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
        include: {
          sender: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const items: InboxItem[] = []

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.receiver : msg.sender
      items.push({
        id: msg.id,
        type: 'DM',
        fromUser: { id: otherUser.id, name: otherUser.name, image: otherUser.image },
        message: msg.content,
        status: msg.read ? 'READ' : 'UNREAD',
        createdAt: msg.createdAt.toISOString(),
        actions: ['reply'],
      })
    }

    for (const conn of connections) {
      items.push({
        id: conn.id,
        type: 'CONNECTION',
        fromUser: { id: conn.requester.id, name: conn.requester.name, image: conn.requester.image },
        message: conn.message,
        status: conn.status,
        createdAt: conn.createdAt.toISOString(),
        actions: ['accept', 'decline'],
      })
    }

    for (const offer of offers) {
      items.push({
        id: offer.id,
        type: 'OFFER',
        fromUser: { id: offer.maker.id, name: offer.maker.name, image: offer.maker.image },
        message: offer.message,
        status: offer.status,
        createdAt: offer.createdAt.toISOString(),
        entity: { type: offer.listingType, id: offer.listingId, title: offer.listingTitle },
        actions: ['accept', 'decline', 'counter', 'view'],
      })
    }

    for (const collab of collabRequests) {
      let entityTitle = ''
      if (collab.entityType === 'PRODUCT') {
        const p = await prisma.product.findUnique({ where: { id: collab.entityId }, select: { title: true } })
        entityTitle = p?.title || ''
      } else if (collab.entityType === 'EVENT') {
        const e = await prisma.event.findUnique({ where: { id: collab.entityId }, select: { title: true } })
        entityTitle = e?.title || ''
      } else if (collab.entityType === 'GROUP') {
        const g = await prisma.group.findUnique({ where: { id: collab.entityId }, select: { name: true } })
        entityTitle = g?.name || ''
      } else if (collab.entityType === 'PROJECT') {
        const p = await prisma.project.findUnique({ where: { id: collab.entityId }, select: { title: true } })
        entityTitle = p?.title || ''
      }

      items.push({
        id: collab.id,
        type: 'COLLAB',
        fromUser: { id: collab.sender.id, name: collab.sender.name, image: collab.sender.image },
        message: collab.message,
        status: collab.status,
        createdAt: collab.createdAt.toISOString(),
        entity: { type: collab.entityType, id: collab.entityId, title: entityTitle },
        actions: ['accept', 'decline', 'message'],
      })
    }

    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const unreadCount = items.filter(i => i.type === 'DM' && i.status === 'UNREAD').length +
      items.filter(i => i.type !== 'DM').length

    return NextResponse.json({ items, unreadCount })
  } catch (error) {
    console.error('GET /api/inbox:', error)
    return apiError("Internal server error", 500)
  }
}
