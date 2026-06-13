import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id },
      select: { userId: true }
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

    const history = await prisma.projectStatusHistory.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(history.map((h: { createdAt: Date }) => ({
      ...h,
      createdAt: h.createdAt.toISOString()
    })))
  } catch (error) {
    console.error('Error fetching project status history:', error)
    return apiError("Failed to fetch history", 500)
  }
}
