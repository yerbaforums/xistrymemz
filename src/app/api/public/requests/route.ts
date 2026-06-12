import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'PENDING'

  const requests = await prisma.request.findMany({
    where: { 
      status,
      plan: { published: true }
    },
    include: {
      plan: { select: { id: true, title: true } },
      user: { select: { name: true, username: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return apiSuccess(requests)
}
