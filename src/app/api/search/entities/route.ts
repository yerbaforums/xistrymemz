import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SEARCH_CONFIG: Record<string, {
  model: string
  titleField: string
  select: Record<string, boolean>
  where: (q: string) => any
  url: (id: string) => string
}> = {
  PLAN: {
    model: 'project',
    titleField: 'title',
    select: { id: true, title: true, userId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
      status: { not: 'ARCHIVED' },
    }),
    url: (id) => `/projects/${id}`,
  },
  PRODUCT: {
    model: 'product',
    titleField: 'title',
    select: { id: true, title: true, userId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
      status: { not: 'ARCHIVED' },
    }),
    url: (id) => `/products/${id}`,
  },
  EVENT: {
    model: 'event',
    titleField: 'title',
    select: { id: true, title: true, organizerId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/events/${id}`,
  },
  REQUEST: {
    model: 'request',
    titleField: 'title',
    select: { id: true, title: true, userId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/requests/${id}`,
  },
  SERVICE: {
    model: 'serviceOffering',
    titleField: 'title',
    select: { id: true, title: true, userId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/services/${id}`,
  },
  GROUP: {
    model: 'group',
    titleField: 'name',
    select: { id: true, name: true, createdById: true },
    where: (q) => ({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/groups/${id}`,
  },
  POST: {
    model: 'post',
    titleField: 'content',
    select: { id: true, content: true, userId: true },
    where: (q) => ({
      content: { contains: q, mode: 'insensitive' as const },
    }),
    url: (id) => `/posts/${id}`,
  },
  SCHOOLCONTENT: {
    model: 'schoolContent',
    titleField: 'title',
    select: { id: true, title: true, userId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/school/content/${id}`,
  },
  SHOP: {
    model: 'user',
    titleField: 'name',
    select: { id: true, name: true },
    where: (q) => ({
      showShop: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { shopName: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/shop/${id}`,
  },
  SCHOOL: {
    model: 'user',
    titleField: 'name',
    select: { id: true, name: true },
    where: (q) => ({
      showSchool: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { schoolName: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/school/${id}`,
  },
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const q = searchParams.get('q') || ''

    if (!type || !q || q.length < 2) {
      return apiSuccess({ items: [] })
    }

    const config = SEARCH_CONFIG[type]
    if (!config) {
      return apiSuccess({ items: [] })
    }

    const results = await (prisma as any)[config.model].findMany({
      where: config.where(q),
      select: config.select,
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    const items = results.map((r: any) => ({
      id: r.id,
      title: r[config.titleField]?.slice(0, 100) || 'Untitled',
      url: config.url(r.id),
      type,
    }))

    return apiSuccess({ items })
  } catch (error) {
    console.error('Error searching entities:', error)
    return apiSuccess({ items: [] })
  }
}
