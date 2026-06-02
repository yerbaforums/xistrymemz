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
