import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const { updateId } = await params
  const comments = await prisma.projectUpdateComment.findMany({
    where: { planUpdateId: updateId },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, image: true } } }
  })
  return apiSuccess(comments)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { updateId } = await params
  const body = await request.json()
  if (!body.content?.trim()) return apiError("Content is required", 400)

  const comment = await prisma.projectUpdateComment.create({
    data: { content: body.content.trim(), planUpdateId: updateId, userId: session.user.id },
    include: { user: { select: { id: true, name: true, image: true } } }
  })
  return apiSuccess(comment)
}
