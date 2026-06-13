import { prisma } from '@/lib/prisma'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export interface RequestQuery {
  isPublic?: boolean
  category?: string
  status?: string
  userId?: string
  search?: string
  page?: number
  limit?: number
}

export async function findRequests(query: RequestQuery) {
  const { isPublic, category, status, userId, search, page = 1, limit = 20 } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (isPublic !== undefined) where.isPublic = isPublic
  if (category) where.category = category
  if (status) where.status = status
  if (userId) where.userId = userId
  if (search) where.title = { contains: search, mode: 'insensitive' }

  const [requests, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
        project: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        _count: { select: { comments: true, fulfillments: true, supports: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.request.count({ where }),
  ])

  return { requests, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function getRequestById(id: string) {
  return prisma.request.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, username: true, image: true, location: true } },
      project: { select: { id: true, title: true } },
      group: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
      event: { select: { id: true, title: true } },
      _count: { select: { comments: true, fulfillments: true, supports: true, contributions: true } },
      hashtags: { include: { hashtag: true } },
    },
  })
}

export async function createRequest(data: Record<string, unknown>, userId: string) {
  const hashtags = extractHashtags((data.description as string) || '')
  const request = await prisma.request.create({
    data: {
      title: data.title as string,
      description: data.description as string || '',
      category: data.category as string || 'OTHER',
      status: data.status as string || 'PENDING',
      priority: data.priority as string || 'MEDIUM',
      budget: data.budget as number | null,
      goalAmount: data.goalAmount as number | null,
      deadline: data.deadline as string | null ? new Date(data.deadline as string) : null,
      location: data.location as string | null,
      isPublic: data.isPublic as boolean ?? true,
      userId,
      projectId: data.projectId as string | null,
      groupId: data.groupId as string | null,
      productId: data.productId as string | null,
    },
  })

  if (hashtags.length > 0) {
    await linkHashtags('REQUEST', request.id, hashtags)
  }

  return request
}

export async function updateRequest(id: string, data: Record<string, unknown>, userId: string) {
  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.userId !== userId) throw new Error('Forbidden')

  return prisma.request.update({
    where: { id },
    data: {
      title: data.title as string | undefined,
      description: data.description as string | undefined,
      status: data.status as string | undefined,
      priority: data.priority as string | undefined,
      budget: data.budget as number | null | undefined,
      goalAmount: data.goalAmount as number | null | undefined,
      isPublic: data.isPublic as boolean | undefined,
    },
  })
}

export async function deleteRequest(id: string, userId: string) {
  const existing = await prisma.request.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.userId !== userId) throw new Error('Forbidden')

  await prisma.requestHashtag.deleteMany({ where: { requestId: id } })
  await prisma.request.delete({ where: { id } })
  return { deleted: true }
}
