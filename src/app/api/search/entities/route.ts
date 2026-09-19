import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

interface SearchableDelegate {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>
}

const SEARCH_CONFIG: Record<string, {
  model: string
  titleField: string
  select: Record<string, boolean>
  urlField?: string
  where: (q: string) => object
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
  FORUMPOST: {
    model: 'forumPost',
    titleField: 'title',
    select: { id: true, title: true, authorId: true },
    where: (q) => ({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { content: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/community/forum/${id}`,
  },
  BOARD: {
    model: 'bulletinBoard',
    titleField: 'name',
    select: { id: true, name: true, slug: true, ownerId: true },
    urlField: 'slug',
    where: (q) => ({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (slug) => `/boards/${slug}`,
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
    select: { id: true, name: true, shopSlug: true },
    urlField: 'shopSlug',
    where: (q) => ({
      showShop: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { shopName: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (slug) => `/shop/${slug}`,
  },
  SCHOOL: {
    model: 'user',
    titleField: 'name',
    select: { id: true, name: true, schoolSlug: true },
    urlField: 'schoolSlug',
    where: (q) => ({
      showSchool: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { schoolName: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (slug) => `/school/${slug}`,
  },
  BLOG: {
    model: 'user',
    titleField: 'name',
    select: { id: true, name: true, blogSlug: true },
    urlField: 'blogSlug',
    where: (q) => ({
      showBlog: true,
      blogSlug: { not: null },
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { blogName: { contains: q, mode: 'insensitive' as const } },
        { blogTagline: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (slug) => `/blog/${slug}`,
  },
  BLOGPOST: {
    model: 'blogPost',
    titleField: 'title',
    select: { id: true, title: true, slug: true, blogId: true },
    where: (q) => ({
      status: 'PUBLISHED',
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { excerpt: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (id) => `/blog/posts/${id}`,
  },
}

export async function GET(request: Request) {
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

    const results = await (prisma as unknown as Record<string, SearchableDelegate>)[config.model].findMany({
      where: config.where(q),
      select: config.select,
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    const items = results.map((r) => ({
      id: r.id,
      title: String(r[config.titleField] ?? '').slice(0, 100) || 'Untitled',
      url: config.url(String(r[(config as { urlField?: string }).urlField || 'id'])),
      type,
    }))

    return apiSuccess({ items })
  } catch (error) {
    console.error('Error searching entities:', error)
    return apiSuccess({ items: [] })
  }
}
