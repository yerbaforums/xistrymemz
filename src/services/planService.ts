import { prisma } from '@/lib/prisma'

export async function getPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true, username: true } },
      _count: { select: { requests: true, joiners: true, events: true } },
    },
  })
}

export async function getPlansByUser(userId: string, publishedOnly = false) {
  return prisma.plan.findMany({
    where: {
      userId,
      ...(publishedOnly ? { published: true } : {}),
    },
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
  })
}

export async function getPublicPlans(limit = 10) {
  return prisma.plan.findMany({
    where: { published: true, status: { in: ['ACTIVE', 'COMPLETED'] } },
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
    take: limit,
  })
}

export async function createPlan(data: {
  title: string
  description?: string | null
  imageUrl?: string | null
  goals?: string | null
  mileposts?: string | null
  userId: string
}) {
  return prisma.plan.create({
    data: {
      title: data.title,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      goals: data.goals || null,
      mileposts: data.mileposts || null,
      milepostStatus: '[]',
      userId: data.userId,
      status: 'ACTIVE',
      published: true,
    },
  })
}

export async function updatePlan(id: string, data: Record<string, unknown>) {
  return prisma.plan.update({ where: { id }, data })
}

export async function deletePlan(id: string) {
  return prisma.plan.delete({ where: { id } })
}

export async function createGettingStartedPlan(userId: string) {
  return prisma.plan.create({
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
