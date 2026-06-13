import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const updates = await prisma.projectUpdate.findMany({
    where: { projectId },
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

  const { id: projectId } = await params
  const body = await request.json()
  const { content, imageUrl, images } = body

  if (!content?.trim()) return apiError("Content is required", 400)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true }
  })
  if (!project) return apiError("Project not found", 404)

  const isOwner = project.userId === session.user.id
  const isEditor = await prisma.projectEditor.findFirst({
    where: { projectId, userId: session.user.id }
  })
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isEditor && !isAdmin) {
    return apiError("Forbidden", 403)
  }

  const update = await prisma.projectUpdate.create({
    data: {
      content: content.trim(),
      imageUrl: imageUrl || null,
      images: images || null,
      userId: session.user.id,
      projectId
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { likesRelation: true, comments: true } }
    }
  })

  return apiSuccess(update)
}
