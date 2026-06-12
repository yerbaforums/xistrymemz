import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const { slug, pinId } = await params
  try {
    const comments = await prisma.pinComment.findMany({
      where: { pinId },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess({ comments })
  } catch (error) {
    console.error('GET comments:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; pinId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }
  const { slug, pinId } = await params
  try {
    const body = await request.json()
    const content = body.content?.trim()
    if (!content) {
      return apiError("Content is required", 400)
    }
    const comment = await prisma.pinComment.create({
      data: { pinId, userId: session.user.id, content },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    })
    return apiSuccess(comment)
  } catch (error) {
    console.error('POST comment:', error)
    return apiError("Internal server error", 500)
  }
}
