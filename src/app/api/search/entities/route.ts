import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

interface SearchableDelegate {
  findMany: (args: unknown) => Promise<Array<Record<string, unknown>>>
}

const SEARCH_CONFIG: Record<string, {
  model: string
  titleField: string
  titleFallbackField?: string
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
  PODCAST: {
    model: 'user',
    titleField: 'name',
    select: { id: true, name: true, podcastSlug: true },
    urlField: 'podcastSlug',
    where: (q) => ({
      showPodcast: true,
      podcastSlug: { not: null },
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { podcastName: { contains: q, mode: 'insensitive' as const } },
        { podcastAbout: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (slug) => `/podcast/${slug}`,
  },
  USER: {
    model: 'user',
    titleField: 'name',
    titleFallbackField: 'username',
    select: { id: true, name: true, username: true },
    urlField: 'username',
    where: (q) => ({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { username: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
    url: (param) => `/profile/${param}`,
  },
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = searchParams.get('type')
    const q = searchParams.get('q') || ''

    if (!typeParam || !q || q.length < 2) {
      return apiSuccess({ items: [] })
    }

    // Accept a single type, a comma-separated list, or ALL — so a picker can
    // search every linkable entity kind in one debounced request.
    const requested = [...new Set(
      (typeParam.toUpperCase() === 'ALL'
        ? Object.keys(SEARCH_CONFIG)
        : typeParam.split(',')
      )
        .map((t) => t.trim().toUpperCase())
        .filter((t) => SEARCH_CONFIG[t]),
    )]

    if (requested.length === 0) {
      return apiSuccess({ items: [] })
    }

    const perTypeTake = requested.length === 1 ? 20 : 8

    const perType = await Promise.all(
      requested.map(async (type) => {
        const config = SEARCH_CONFIG[type]
        const results = await (prisma as unknown as Record<string, SearchableDelegate>)[config.model].findMany({
          where: config.where(q),
          select: config.select,
          take: perTypeTake,
          orderBy: { createdAt: 'desc' },
        })

        const urlKey = config.urlField
        const fallbackKey = config.titleFallbackField
        return results.map((r) => ({
          id: String(r.id),
          title: String(r[config.titleField] ?? (fallbackKey ? r[fallbackKey] : '') ?? '').slice(0, 100) || 'Untitled',
          url: config.url(String((urlKey ? r[urlKey] : undefined) ?? r.id)),
          type,
        }))
      }),
    )

    return apiSuccess({ items: perType.flat().slice(0, 40) })
  } catch (error) {
    console.error('Error searching entities:', error)
    return apiSuccess({ items: [] })
  }
}
