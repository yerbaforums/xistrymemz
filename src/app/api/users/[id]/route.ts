import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params

    // PUBLIC FIELDS ONLY - no sensitive data exposed
    const publicSelect = {
      id: true,
      name: true,
      image: true,
      coverImage: true,
      bio: true,
      location: true,
      website: true,
      userClass: true,
      shopName: true,
      shopSlug: true,
      schoolName: true,
      schoolSlug: true,
      createdAt: true,
      reputationScore: true,
      verifiedEmail: true,
      acceptsDonations: true,
      donationAddress: true,
      donationCurrency: true,
      _count: {
        select: {
          plans: true,
          posts: true,
          products: true
        }
      }
    }

    // Check if id is a username/shopSlug first
    let user = await prisma.user.findUnique({
      where: { shopSlug: id },
      select: publicSelect
    })

    // If not found by slug, try by id
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id },
        select: publicSelect
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    const [plans, posts, products, connections, groupMemberships] = await Promise.all([
      prisma.plan.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          status: true,
          published: true,
          pinned: true,
          createdAt: true
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10
      }),
      prisma.post.findMany({
        where: { userId: id },
        select: {
          id: true,
          content: true,
          imageUrl: true,
          pinned: true,
          likes: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 20
      }),
      prisma.product.findMany({
        where: { userId: id, published: true },
        select: {
          id: true,
          title: true,
          price: true,
          imageUrl: true,
          type: true,
          pinned: true,
          createdAt: true
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10
      }),
      prisma.connection.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterId: id },
            { receiverId: id }
          ]
        },
        include: {
          requester: {
            select: { id: true, name: true, image: true, userClass: true }
          },
          receiver: {
            select: { id: true, name: true, image: true, userClass: true }
          }
        },
        take: 12
      }),
      prisma.groupMember.findMany({
        where: { userId: id },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              _count: { select: { members: true } }
            }
          }
        },
        orderBy: { joinedAt: 'desc' },
        take: 10
      })
    ])

    let isConnected = false
    let hasPendingRequest = false
    let connectionId = null

    if (session?.user?.id) {
      const connection = await prisma.connection.findFirst({
        where: {
          OR: [
            { requesterId: session.user.id, receiverId: id },
            { requesterId: id, receiverId: session.user.id }
          ]
        }
      })

      if (connection) {
        isConnected = connection.status === 'ACCEPTED'
        hasPendingRequest = connection.status === 'PENDING' && connection.requesterId === id
        connectionId = connection.id
      }
    }

    const connectedCount = await prisma.connection.count({
      where: {
        status: 'CONNECTED',
        OR: [
          { requesterId: id },
          { receiverId: id }
        ]
      }
    })

    const userConnections = connections.map(conn => {
      const otherUser = conn.requesterId === id ? conn.receiver : conn.requester
      return {
        id: otherUser.id,
        name: otherUser.name,
        image: otherUser.image,
        userClass: otherUser.userClass
      }
    })

    // Fetch user links and donation info if public
    const [links, donationInfo] = await Promise.all([
      prisma.userLink.findMany({
        where: { userId: user.id },
        orderBy: { sortOrder: 'asc' }
      }),
      Promise.resolve(
        user.acceptsDonations ? {
          donationAddress: user.donationAddress,
          donationCurrency: user.donationCurrency
        } : null
      )
    ])

    return NextResponse.json({
      user: {
        ...user,
        planCount: user._count.plans,
        postCount: user._count.posts,
        productCount: user._count.products,
        connectionCount: connectedCount,
        isConnected,
        hasPendingRequest,
        connectionId,
        acceptsDonations: user.acceptsDonations || false,
        donationAddress: donationInfo?.donationAddress,
        donationCurrency: donationInfo?.donationCurrency,
        links
      },
      plans,
      posts,
      products,
      connections: userConnections,
      groups: groupMemberships.map(gm => ({
        id: gm.group.id,
        name: gm.group.name,
        imageUrl: gm.group.imageUrl,
        memberCount: gm.group._count.members,
        role: gm.role,
        joinedAt: gm.joinedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await context.params

    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, bio, location, website, image, coverImage, userClass } = await request.json()

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name !== undefined ? (name || null) : undefined,
        bio: bio !== undefined ? (bio || null) : undefined,
        location: location !== undefined ? (location || null) : undefined,
        website: website !== undefined ? (website || null) : undefined,
        image: image !== undefined ? (image || null) : undefined,
        coverImage: coverImage !== undefined ? (coverImage || null) : undefined,
        userClass: userClass !== undefined ? (userClass || null) : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        coverImage: true,
        bio: true,
        location: true,
        website: true,
        userClass: true,
        createdAt: true
      }
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
