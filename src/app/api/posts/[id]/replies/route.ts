import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      return apiError("Post not found", 404)
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const [replies, total] = await Promise.all([
      prisma.post.findMany({
        where: { parentId: id },
        include: {
          user: {
            select: { id: true, name: true, image: true, username: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset
      }),
      prisma.post.count({ where: { parentId: id } })
    ])

    return NextResponse.json({ replies, total })
  } catch (error) {
    console.error('Error fetching replies:', error)
    return apiError("Failed to fetch replies", 500)
  }
}
