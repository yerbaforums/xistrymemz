import { prisma } from '@/lib/prisma'

export async function getProjectById(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true, username: true } },
      _count: { select: { requests: true, joiners: true, events: true } },
    },
  })
}

export async function getProjectsByUser(userId: string, publishedOnly = false, skip = 0, take = 20) {
  const where = {
    userId,
    ...(publishedOnly ? { published: true } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        status: true,
        published: true,
        pinned: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { requests: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ])
  return { items, total }
}

export async function getPublicProjects(skip = 0, take = 10) {
  const where = { published: true, status: { in: ['ACTIVE', 'COMPLETED'] } }
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        status: true,
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { requests: true, joiners: true } },
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      skip,
      take,
    }),
    prisma.project.count({ where }),
  ])
  return { items, total }
}

export async function createProject(data: {
  title: string
  description?: string | null
  imageUrl?: string | null
  status?: string | null
  published?: boolean | null
  goals?: string | null
  mileposts?: string | null
  userId: string
}) {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      goals: data.goals || null,
      mileposts: data.mileposts || null,
      milepostStatus: '[]',
      userId: data.userId,
      status: data.status || 'ACTIVE',
      published: data.published ?? true,
    },
  })
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  return prisma.project.update({ where: { id }, data })
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } })
}

export async function createGettingStartedProject(userId: string) {
  return prisma.project.create({
    data: {
      title: 'Getting Started on XistrYmemZ',
      description: 'A simple plan to help you explore the platform and connect with the community. Check off each milestone as you go!',
      goals: JSON.stringify([
        'Complete your profile',
        'Explore the marketplace',
        'Join or create a group',
        'Make your first post',
        'Connect with a community member',
      ]),
      mileposts: JSON.stringify([
        { title: '👋 Introduce yourself', description: 'Post on the feed to say hello to the community', done: false },
        { title: '🛒 Browse the marketplace', description: 'Check out products and services available near you', done: false },
        { title: '👥 Join a group', description: 'Find a group that matches your interests', done: false },
        { title: '💬 Make a connection', description: 'Send a message or connect with another member', done: false },
        { title: '🚀 Create something', description: 'Post a product, service, event, or request', done: false },
      ]),
      milepostStatus: '[]',
      userId,
      status: 'ACTIVE',
      published: false,
    },
  })
}
