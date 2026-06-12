import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: planId } = await params
  const updates = await prisma.planUpdate.findMany({
    where: { planId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likesRelation: true, comments: true } }
    }
  })
  return apiSuccess(updates)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { id: planId } = await params
  const body = await request.json()
  const { content, imageUrl, images } = body

  if (!content?.trim()) return apiError("Content is required", 400)

  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: session.user.id }
  })
  if (!plan) return apiError("Not found or not owner", 404)

  const update = await prisma.planUpdate.create({
    data: {
      content: content.trim(),
      imageUrl: imageUrl || null,
      images: images || null,
      userId: session.user.id,
      planId
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likesRelation: true, comments: true } }
    }
  })

  return apiSuccess(update)
}
