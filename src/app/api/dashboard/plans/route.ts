import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, status: true, published: true, _count: { select: { requests: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    return apiSuccess(projects)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return apiError("Failed to fetch projects", 500)
  }
}