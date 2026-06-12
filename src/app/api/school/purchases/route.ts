import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const purchases = await prisma.schoolPurchase.findMany({
    where: { userId: session.user.id },
    include: {
      content: {
        select: { id: true, title: true, contentType: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return apiSuccess(purchases)
}
