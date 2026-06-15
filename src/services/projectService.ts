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
  const where = { published: true, status: { in: ['IDEA', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED'] } }
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
  images?: string | null
  videoUrl?: string | null
  status?: string | null
  published?: boolean | null
  category?: string | null
  goals?: string | null
  mileposts?: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  lookingForCollaborators?: boolean | null
  needsVolunteers?: boolean | null
  volunteerRoles?: string | null
  volunteerDescription?: string | null
  goalAmount?: number | null
  acceptsDonations?: boolean | null
  donationAddress?: string | null
  donationCurrency?: string | null
  donationDescription?: string | null
  donationAddresses?: string | null
  phases?: string | null
  userId: string
}) {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      images: data.images || null,
      videoUrl: data.videoUrl || null,
      category: data.category || null,
      goals: data.goals || null,
      mileposts: data.mileposts || null,
      milepostStatus: '[]',
      location: data.location || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      lookingForCollaborators: data.lookingForCollaborators ?? false,
      needsVolunteers: data.needsVolunteers ?? false,
      volunteerRoles: data.volunteerRoles || null,
      volunteerDescription: data.volunteerDescription || null,
      goalAmount: data.goalAmount ?? null,
      acceptsDonations: data.acceptsDonations ?? false,
      donationAddress: data.donationAddress || null,
      donationCurrency: data.donationCurrency || 'ETH',
      donationDescription: data.donationDescription || null,
      donationAddresses: data.donationAddresses || null,
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

export async function followProject(projectId: string, userId: string) {
  return prisma.projectJoiner.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role: 'FOLLOWER' },
    create: { projectId, userId, role: 'FOLLOWER' },
  })
}

export async function unfollowProject(projectId: string, userId: string) {
  return prisma.projectJoiner.deleteMany({
    where: { projectId, userId, role: 'FOLLOWER' },
  })
}

export async function isFollowing(projectId: string, userId: string): Promise<boolean> {
  const entry = await prisma.projectJoiner.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true },
  })
  return !!entry
}

export async function getFollowerCount(projectId: string): Promise<number> {
  return prisma.projectJoiner.count({
    where: { projectId, role: 'FOLLOWER' },
  })
}

export async function createGettingStartedProject(userId: string) {
  return prisma.project.create({
    data: {
      title: 'Getting Started on XistrYmemZ',
      description: 'A simple project to help you explore the platform and connect with the community. Check off each milestone as you go!',
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
