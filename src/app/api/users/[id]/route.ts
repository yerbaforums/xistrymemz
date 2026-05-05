import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify } from '@/lib/utils'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id: param } = await context.params

    // PUBLIC FIELDS ONLY - no sensitive data exposed
    const publicSelect = {
      id: true,
      name: true,
      image: true,
      coverImage: true,
      bio: true,
      location: true,
      neighborhood: true,
      latitude: true,
      longitude: true,
      searchRadius: true,
      website: true,
      userClass: true,
      role: true,
      shopName: true,
      shopSlug: true,
      schoolName: true,
      schoolSlug: true,
      createdAt: true,
      earthId: true,
      verificationLevel: true,
      reputationScore: true,
      verifiedEmail: true,
      verifiedPhone: true,
      verifiedIdentity: true,
      verifiedAddress: true,
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

    // Resolve param: try shopSlug first, then slugified name, then id
    let user = await prisma.user.findUnique({
      where: { shopSlug: param },
      select: publicSelect
    })

    if (!user) {
      const slug = slugify(param)
      if (slug) {
        user = await prisma.user.findFirst({
          where: {
            name: {
              contains: param,
              mode: 'insensitive'
            }
          },
          select: publicSelect
        })
        // Verify the found user's name actually slugifies to the param
        if (user && slugify(user.name) !== slug) {
          user = null
        }
      }
    }

    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: param },
        select: publicSelect
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    const postsTake = 20
    const [plans, posts, products, connections, groupMemberships, totalPostCount, userLocations] = await Promise.all([
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
        where: {
          OR: [
            { userId, targetUserId: null },
            { targetUserId: userId }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              shopSlug: true
            }
          }
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ],
        take: postsTake
      }),
      prisma.product.findMany({
        where: { userId: userId, published: true },
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
            { requesterId: userId },
            { receiverId: userId }
          ]
        },
        include: {
          requester: {
            select: { id: true, name: true, image: true, userClass: true, shopSlug: true }
          },
          receiver: {
            select: { id: true, name: true, image: true, userClass: true, shopSlug: true }
          }
        },
        take: 12
      }),
      prisma.groupMember.findMany({
        where: { userId: userId },
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
      }),
      prisma.post.count({
        where: {
          OR: [
            { userId, targetUserId: null },
            { targetUserId: userId }
          ]
        }
      }),
      prisma.userLocation.findMany({
        where: { userId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
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
            { requesterId: session.user.id, receiverId: userId },
            { requesterId: userId, receiverId: session.user.id }
          ]
        }
      })

      if (connection) {
        isConnected = connection.status === 'ACCEPTED'
        hasPendingRequest = connection.status === 'PENDING'
        connectionId = connection.id
      }
    }

    const connectedCount = await prisma.connection.count({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { receiverId: userId }
        ]
      }
    })

    const userConnections = connections.map(conn => {
      const otherUser = conn.requesterId === userId ? conn.receiver : conn.requester
      return {
        id: otherUser.id,
        name: otherUser.name,
        image: otherUser.image,
        userClass: otherUser.userClass,
        shopSlug: otherUser.shopSlug
      }
    })

    // Fetch user links and donation info if public
    const [links, donationAddresses] = await Promise.all([
      prisma.userLink.findMany({
        where: { userId: user.id },
        orderBy: { sortOrder: 'asc' }
      }),
      user.acceptsDonations ? prisma.donationAddress.findMany({
        where: { userId: user.id, isPublic: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      }) : Promise.resolve([])
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
        donationAddresses,
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
      })),
      totalPostCount,
      userLocations: userLocations.map(loc => ({
        id: loc.id,
        name: loc.name,
        location: loc.location,
        latitude: loc.latitude,
        longitude: loc.longitude,
        isPrimary: loc.isPrimary
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
