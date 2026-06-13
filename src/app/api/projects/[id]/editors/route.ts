import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: projectId } = await params
  const { email } = await request.json()

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true }
  })

  if (!project) {
    return apiError("Project not found", 404)
  }

  if (project.userId !== session.user.id) {
    return apiError("Only the project owner can add editors", 403)
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return apiError("User not found", 404)
  }

  const editor = await prisma.projectEditor.create({
    data: {
      projectId,
      userId: user.id
    }
  })

  return apiSuccess(editor)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: projectId } = await params
  const { searchParams } = new URL(request.url)
  const editorId = searchParams.get('editorId')

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true }
  })

  if (!project) {
    return apiError("Project not found", 404)
  }

  if (project.userId !== session.user.id) {
    return apiError("Only the project owner can remove editors", 403)
  }

  await prisma.projectEditor.delete({
    where: { id: editorId! }
  })

  return apiSuccess({ success: true })
}
