import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// GET own blog (caller's blog)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      blogName: true,
      blogAbout: true,
      blogImage: true,
      blogCoverImage: true,
      blogCoverStyle: true,
      blogSlug: true,
      blogTagline: true,
      blogTiers: true,
      showBlog: true,
    },
  })
  return apiSuccess(user)
}

// PUT create/update own blog
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const body = await request.json().catch(() => ({}) as Record<string, unknown>)
  const {
    blogName, blogAbout, blogImage, blogCoverImage, blogCoverStyle,
    blogSlug, blogTagline, blogTiers, showBlog,
  } = body as {
    blogName?: string; blogAbout?: string; blogImage?: string
    blogCoverImage?: string; blogCoverStyle?: string
    blogSlug?: string; blogTagline?: string; blogTiers?: string; showBlog?: boolean
  }

  if (!blogName?.trim()) {
    return apiError('Blog name is required', 400)
  }

  const slug = (blogSlug || slugify(blogName)) || null
  if (!slug) return apiError('Blog slug is required', 400)

  // Slug uniqueness (excluding self)
  const existing = await prisma.user.findFirst({
    where: { blogSlug: slug, id: { not: session.user.id } },
    select: { id: true },
  })
  if (existing) return apiError('That blog slug is already taken', 409)

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      blogName: blogName.trim(),
      blogAbout: blogAbout?.trim() || null,
      blogImage: blogImage || null,
      blogCoverImage: blogCoverImage || null,
      blogCoverStyle: blogCoverStyle || 'cover',
      blogSlug: slug,
      blogTagline: blogTagline?.trim() || null,
      blogTiers: blogTiers || null,
      showBlog: showBlog !== undefined ? showBlog : true,
    },
  })

  return apiSuccess({
    blogName: user.blogName,
    blogAbout: user.blogAbout,
    blogImage: user.blogImage,
    blogCoverImage: user.blogCoverImage,
    blogCoverStyle: user.blogCoverStyle,
    blogSlug: user.blogSlug,
    blogTagline: user.blogTagline,
    blogTiers: user.blogTiers,
    showBlog: user.showBlog,
  })
}

// DELETE unpublish or delete blog
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiUnauthorized()

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'unpublish') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { showBlog: false },
    })
    return apiSuccess({ success: true, action: 'unpublished' })
  }

  if (action === 'delete') {
    // Deleting the blog removes its posts via cascade, then clears user fields.
    if ((session.user as { blogSlug?: string | null }).blogSlug) {
      const blogOwner = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { blogSlug: true },
      })
      if (blogOwner?.blogSlug) {
        // BlogPost rows cascade on User delete only; clear explicitly.
        await prisma.blogPost.deleteMany({ where: { blogId: session.user.id } })
      }
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        blogName: null, blogAbout: null, blogImage: null,
        blogCoverImage: null, blogSlug: null, blogTagline: null,
        blogTiers: null, showBlog: true,
      },
    })
    return apiSuccess({ success: true, action: 'deleted' })
  }

  return apiError('Invalid action', 400)
}