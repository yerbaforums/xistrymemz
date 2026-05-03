import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const members = await prisma.user.findMany({
      where: {
        id: { not: session.user.id }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        location: true,
        userClass: true,
        shopSlug: true,
        createdAt: true,
        _count: {
          select: { 
            plans: true,
            requests: true,
            products: true,
            sentConnections: true,
            receivedConnections: true,
            posts: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const membersWithCount = members.map((m: typeof members[0] & { _count: { 
      plans: number
      requests: number
      products: number
      sentConnections: number
      receivedConnections: number
      posts: number
    } }) => ({
      ...m,
      planCount: m._count.plans,
      requestCount: m._count.requests,
      productCount: m._count.products,
      connectionCount: m._count.sentConnections + m._count.receivedConnections,
      postCount: m._count.posts
    }))

    const connections = await prisma.connection.findMany({
      where: {
        status: 'CONNECTED',
        OR: [
          { requesterId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, image: true, location: true, shopSlug: true }
        },
        receiver: {
          select: { id: true, name: true, email: true, image: true, location: true, shopSlug: true }
        }
      }
    })

    const pendingRequests = await prisma.connection.findMany({
      where: {
        receiverId: session.user.id,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json({
      members: membersWithCount,
      connections,
      pendingRequests
    })
  } catch (error) {
    console.error('Error fetching community data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
