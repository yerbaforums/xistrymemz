import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const context = searchParams.get('context')

    const userId = session.user.id

    const connections = await prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    })

    const connectedUserIds = new Set<string>()
    connections.forEach(c => {
      if (c.requesterId !== userId) connectedUserIds.add(c.requesterId)
      if (c.receiverId !== userId) connectedUserIds.add(c.receiverId)
    })
    connectedUserIds.add(userId)

    const wherePosts: Record<string, unknown> = {
      userId: { in: Array.from(connectedUserIds) }
    }
    if (context && ['PROFILE', 'SHOP', 'SCHOOL', 'WALL'].includes(context)) {
      wherePosts.context = context
    }

    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where: wherePosts as any,
        include: {
          user: { select: { id: true, name: true, image: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.post.count({ where: wherePosts as any })
    ])

    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true }
    })
    const groupIds = groupMemberships.map(m => m.groupId)

    const [groupPosts, forumPosts] = await Promise.all([
      groupIds.length > 0
        ? prisma.groupPost.findMany({
            where: { groupId: { in: groupIds } },
            include: {
              user: { select: { id: true, name: true, image: true, username: true } },
              group: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset
          })
        : Promise.resolve([]),
      prisma.forumPost.findMany({
        where: {
          authorId: { in: Array.from(connectedUserIds) }
        },
        include: {
          author: { select: { id: true, name: true, image: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      })
    ])

    const feed = [
      ...posts.map(p => ({
        id: p.id,
        content: p.content,
        images: p.images,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
        context: p.context,
        sourceType: 'POST' as const,
        type: 'post' as const
      })),
      ...groupPosts.map(p => ({
        id: p.id,
        content: p.content,
        images: null,
        createdAt: p.createdAt.toISOString(),
        user: p.user,
        sourceType: 'GROUPPOST' as const,
        groupName: p.group.name,
        groupId: p.group.id,
        type: 'groupPost' as const
      })),
      ...forumPosts.map(p => ({
        id: p.id,
        content: p.content,
        images: null,
        createdAt: p.createdAt.toISOString(),
        user: p.author,
        sourceType: 'FORUMPOST' as const,
        type: 'forumPost' as const
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)

    return NextResponse.json({ feed, total: posts.length + groupPosts.length + forumPosts.length })
  } catch (error) {
    console.error('Error fetching feed:', error)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}
