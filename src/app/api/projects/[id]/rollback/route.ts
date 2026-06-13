import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const body = await request.json()
    const { toStatus, reason } = body

    if (!toStatus) {
      return apiError("toStatus is required", 400)
    }

    const project = await prisma.project.findUnique({
      where: { id },
      select: { userId: true, status: true }
    })

    if (!project) {
      return apiError("Project not found", 404)
    }

    const isOwner = project.userId === session.user.id
    const isEditor = await prisma.projectEditor.findFirst({
      where: { projectId: id, userId: session.user.id }
    })
    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'

    if (!isOwner && !isEditor && !isAdmin) {
      return apiError("Forbidden", 403)
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { status: toStatus }
    })

    await prisma.projectStatusHistory.create({
      data: {
        projectId: id,
        fromStatus: project.status,
        toStatus,
        reason: reason || null
      }
    })

    return apiSuccess({
      ...updatedProject,
      createdAt: updatedProject.createdAt.toISOString(),
      updatedAt: updatedProject.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error rolling back project status:', error)
    return apiError("Failed to rollback status", 500)
  }
}
