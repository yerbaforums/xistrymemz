import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: true } }
      }
    })
    return apiSuccess(categories)
  } catch (error) {
    console.error('Error fetching forum categories:', error)
    return apiError("Failed to fetch categories", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { name, description, slug, icon, sortOrder } = body

    const existing = await prisma.forumCategory.findUnique({
      where: { slug }
    })
    if (existing) {
      return apiError("Category slug already exists", 400)
    }

    const category = await prisma.forumCategory.create({
      data: {
        name,
        description,
        slug,
        icon,
        sortOrder: sortOrder || 0
      }
    })

    return apiSuccess(category)
  } catch (error) {
    console.error('Error creating forum category:', error)
    return apiError("Failed to create category", 500)
  }
}