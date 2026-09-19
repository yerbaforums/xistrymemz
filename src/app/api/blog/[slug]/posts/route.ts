import { apiError, apiSuccess, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

// POST create a new blog post (owner only)
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()
  const userId = session.user.id as string

  const { slug } = await params
  const user = await prisma.user.findFirst({
    where: { blogSlug: slug },
    select: { id: true },
  })
  if (!user) return apiError('Blog not found', 404)
  if (user.id !== userId) return apiError('You can only post to your own blog', 403)

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    title, content, excerpt, coverImage, status, visibility,
    tier, price, currency, tags,
  } = body as {
    title?: string; content?: string; excerpt?: string; coverImage?: string
    status?: string; visibility?: string; tier?: string
    price?: number; currency?: string; tags?: string[] | string
  }

  if (!title?.trim()) return apiError('Title is required', 400)
  if (!content?.trim()) return apiError('Content is required', 400)

  let postSlug = slugify(title)
  if (!postSlug) postSlug = `post-${Date.now()}`

  // Ensure unique slug within the blog
  let unique = false
  let counter = 0
  while (!unique) {
    const candidate = counter === 0 ? postSlug : `${postSlug}-${counter}`
    const existing = await prisma.blogPost.findUnique({
      where: { blogId_slug: { blogId: user.id, slug: candidate } },
      select: { id: true },
    })
    if (!existing) {
      postSlug = candidate
      unique = true
    } else {
      counter += 1
    }
  }

  const isPublished = status === 'PUBLISHED'
  const post = await prisma.blogPost.create({
    data: {
      blogId: user.id,
      slug: postSlug,
      title: title.trim(),
      content: content.trim(),
      excerpt: excerpt?.trim() || null,
      coverImage: coverImage || null,
      status: isPublished ? 'PUBLISHED' : 'DRAFT',
      visibility: visibility || 'FREE',
      tier: tier || null,
      price: typeof price === 'number' ? price : 0,
      currency: currency || 'USD',
      tags: Array.isArray(tags) ? JSON.stringify(tags) : typeof tags === 'string' ? tags : null,
      publishedAt: isPublished ? new Date() : null,
    },
  })

  return apiSuccess(post)
}