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

  const { id } = await params
  const body = await request.json()

  const req = await prisma.request.findFirst({
    where: {
      id,
      status: 'PENDING'
    },
    include: {
      user: true,
      project: true,
      product: true
    }
  })

  if (!req) {
    return apiError("Request not found or already processed", 404)
  }

  if (req.userId === session.user.id) {
    return apiError("Cannot purchase your own request", 400)
  }

  const updatedRequest = await prisma.request.update({
    where: { id },
    data: { status: 'APPROVED' }
  })

  await prisma.requestStatusHistory.create({
    data: {
      requestId: id,
      fromStatus: req.status,
      toStatus: 'APPROVED',
      changedById: session.user.id,
      reason: `Item purchased on behalf of requester: ${req.product?.title || 'Marketplace item'}`
    }
  })

  if (body.message && req.userId) {
    await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: req.userId,
        content: body.message || 'Thank you for your request! I have purchased the item on your behalf.'
      }
    })
  }

  return apiSuccess(updatedRequest)
}
