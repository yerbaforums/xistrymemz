import { apiSuccess } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

// GET list all blogs (like /api/shops)
export async function GET() {
  try {
    const blogs = await prisma.user.findMany({
      where: {
        blogSlug: { not: null },
        blogName: { not: '' },
        showBlog: true,
      },
      select: {
        id: true,
        blogName: true,
        blogAbout: true,
        blogImage: true,
        blogCoverImage: true,
        blogSlug: true,
        blogTagline: true,
        name: true,
        username: true,
        image: true,
        location: true,
        _count: {
          select: { blogPosts: { where: { status: 'PUBLISHED' } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const blogData = await Promise.all(
      blogs.map(async (b) => {
        const recent = await prisma.blogPost.findFirst({
          where: { blogId: b.id, status: 'PUBLISHED' },
          orderBy: { publishedAt: 'desc' },
          select: { title: true, excerpt: true, publishedAt: true },
        })
        return { ...b, latestPost: recent }
      })
    )

    return apiSuccess({ blogs: blogData })
  } catch (error) {
    console.error('Error fetching blogs:', error)
    return apiSuccess({ blogs: [] })
  }
}