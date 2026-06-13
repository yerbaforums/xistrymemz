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

    const requests = await prisma.request.findMany({
      where: { userId: session.user.id },
      include: { 
        user: { select: { name: true, email: true } }, 
        project: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        product: { select: { id: true, title: true } },
        schoolContent: { select: { id: true, title: true } },
        event: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return apiSuccess(requests)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return apiError("Failed to fetch requests", 500)
  }
}