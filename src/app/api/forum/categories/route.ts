import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'category'
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    // Non-admins only see approved categories; admins see everything
    // including community submissions waiting for review.
    const categories = await prisma.forumCategory.findMany({
      where: isAdmin ? undefined : { status: 'APPROVED' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        parent: { select: { id: true, name: true, slug: true, icon: true } },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            icon: true,
            description: true,
            status: true,
            _count: { select: { posts: true } },
          },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        createdBy: { select: { id: true, name: true, username: true } },
        _count: { select: { posts: true } },
      },
    })
    return apiSuccess({ categories, isAdmin })
  } catch (error) {
    console.error('Error fetching forum categories:', error)
    return apiError("Failed to fetch categories", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiUnauthorized()
    }

    const body = await req.json()
    const { name, description, icon, parentId } = body

    if (!name || !name.trim()) {
      return apiError("Category name is required", 400)
    }

    const slug = slugify(name)
    const existing = await prisma.forumCategory.findUnique({
      where: { slug },
    })
    if (existing) {
      return apiError("A category with this name already exists", 400)
    }

    if (parentId) {
      const parent = await prisma.forumCategory.findUnique({
        where: { id: parentId },
        select: { id: true },
      })
      if (!parent) {
        return apiError("Parent category not found", 400)
      }
    }

    const isAdmin = session.user.role === 'ADMIN'
    const lastSort = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'desc' },
      take: 1,
      select: { sortOrder: true },
    })

    const category = await prisma.forumCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon?.trim() || '📁',
        slug,
        parentId: parentId || null,
        createdById: session.user.id,
        status: isAdmin ? 'APPROVED' : 'PENDING',
        sortOrder: (lastSort[0]?.sortOrder || 0) + 1,
      },
      include: {
        parent: { select: { id: true, name: true, slug: true, icon: true } },
        createdBy: { select: { id: true, name: true, username: true } },
      },
    })

    return apiSuccess(category, 201)
  } catch (error) {
    console.error('Error creating forum category:', error)
    return apiError("Failed to create category", 500)
  }
}