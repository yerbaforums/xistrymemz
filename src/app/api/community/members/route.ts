import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')))
    const skip = (page - 1) * pageSize

    const [members, totalMembers] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { not: session.user.id }
        },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
          location: true,
          userClass: true,
          role: true,
          shopSlug: true,
          createdAt: true,
          lastActiveAt: true,
          lookingForCollaborators: true,
          _count: {
            select: { 
              plans: true,
              requests: true,
              products: true,
              posts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({
        where: {
          id: { not: session.user.id }
        }
      })
    ])

    const membersWithCount = members.map(m => ({
      ...m,
      planCount: m._count.plans,
      requestCount: m._count.requests,
      productCount: m._count.products,
      connectionCount: 0,
      postCount: m._count.posts
    }))

    const acceptedConnections = await prisma.connection.findMany({
      where: { status: 'ACCEPTED' },
      select: { requesterId: true, receiverId: true }
    })

    const countMap = new Map<string, number>()
    for (const c of acceptedConnections) {
      countMap.set(c.requesterId, (countMap.get(c.requesterId) || 0) + 1)
      countMap.set(c.receiverId, (countMap.get(c.receiverId) || 0) + 1)
    }

    membersWithCount.forEach(m => {
      m.connectionCount = countMap.get(m.id) || 0
    })

    const [connections, totalConnections] = await Promise.all([
      prisma.connection.findMany({
        where: {
          status: 'CONNECTED',
          OR: [
            { requesterId: session.user.id },
            { receiverId: session.user.id }
          ]
        },
        skip,
        take: pageSize,
        include: {
          requester: {
            select: { id: true, name: true, username: true, email: true, image: true, location: true, shopSlug: true, lastActiveAt: true, lookingForCollaborators: true }
          },
          receiver: {
            select: { id: true, name: true, username: true, email: true, image: true, location: true, shopSlug: true, lastActiveAt: true, lookingForCollaborators: true }
          }
        }
      }),
      prisma.connection.count({
        where: {
          status: 'CONNECTED',
          OR: [
            { requesterId: session.user.id },
            { receiverId: session.user.id }
          ]
        }
      })
    ])

    const [pendingRequests, totalPendingRequests] = await Promise.all([
      prisma.connection.findMany({
        where: {
          receiverId: session.user.id,
          status: 'PENDING'
        },
        skip,
        take: pageSize,
        include: {
          requester: {
            select: { id: true, name: true, username: true, email: true, image: true, lastActiveAt: true, lookingForCollaborators: true }
          }
        }
      }),
      prisma.connection.count({
        where: {
          receiverId: session.user.id,
          status: 'PENDING'
        }
      })
    ])

    return NextResponse.json({
      members: {
        items: membersWithCount,
        total: totalMembers,
        page,
        pageSize
      },
      connections: {
        items: connections,
        total: totalConnections,
        page,
        pageSize
      },
      pendingRequests: {
        items: pendingRequests,
        total: totalPendingRequests,
        page,
        pageSize
      }
    })
  } catch (error) {
    console.error('Error fetching community data:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}
