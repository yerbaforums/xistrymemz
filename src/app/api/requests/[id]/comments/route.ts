import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  const comments = await prisma.comment.findMany({
    where: { requestId: id },
    include: {
      user: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  return apiSuccess(comments)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const body = await request.json()
  const { content } = body

  if (!content) {
    return apiError("Content is required", 400)
  }

  const req = await prisma.request.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { project: { userId: session.user.id } }
      ]
    }
  })

  if (!req) {
    return apiError("Request not found", 404)
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      userId: session.user.id,
      requestId: id
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  return apiSuccess(comment)
}
