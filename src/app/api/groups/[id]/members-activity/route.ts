import { apiError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const parsedLimit = parseInt(searchParams.get('limit') || '10')
  const limit = Math.min(50, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 10))

  // Get group members
  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true, isPrivate: true }
  })

  if (!group) {
    return apiError("Group not found", 404)
  }

  // Private groups: only members may view member activity
  if (group.isPrivate) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id },
      select: { id: true }
    })
    if (!membership) {
      return apiError("Forbidden", 403)
    }
  }

  const memberIds = await prisma.groupMember.findMany({
    where: { groupId: id },
    select: { userId: true }
  }).then(members => members.map(m => m.userId))

  if (memberIds.length === 0) {
    return NextResponse.json({ projects: [], requests: [], products: [] })
  }

  // Fetch recent projects from members
  const projects = await prisma.project.findMany({
    where: {
      userId: { in: memberIds },
      published: true
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      category: true,
      location: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { joiners: true, requests: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  // Fetch recent requests from members
  const requests = await prisma.request.findMany({
    where: {
      userId: { in: memberIds }
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      category: true,
      location: true,
      budget: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, title: true } },
      product: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  // Fetch recent products from members
  const products = await prisma.product.findMany({
    where: {
      userId: { in: memberIds },
      published: true
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      type: true,
      category: true,
      location: true,
      imageUrl: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  })

  // Fetch recent events from members
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { organizerId: { in: memberIds } },
        { groupId: id }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true,
      eventDate: true,
      location: true,
      latitude: true,
      longitude: true,
      maxJoiners: true,
      eventJoiners: { select: { userId: true } },
      organizer: { select: { id: true, name: true, image: true } }
    },
    orderBy: { eventDate: 'asc' },
    take: limit
  })

  return NextResponse.json({
    projects: projects.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      joinerCount: p._count.joiners,
      requestCount: p._count.requests
    })),
    requests: requests.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString()
    })),
    products: products.map(p => ({
      ...p,
      createdAt: p.createdAt.toISOString()
    })),
    events: events.map(e => ({
      ...e,
      eventDate: e.eventDate?.toISOString() || null,
      joinerCount: e.eventJoiners.length,
      organizer: e.organizer
    }))
  })
}
