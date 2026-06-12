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
  const amount = parseFloat(body.amount)

  if (!amount || amount <= 0) {
    return apiError("Valid amount required", 400)
  }

  const fundingRequest = await prisma.request.findFirst({
    where: {
      id,
      goalAmount: { gt: 0 }
    }
  })

  if (!fundingRequest) {
    return apiError("Funding request not found or not active", 404)
  }

  const [contribution] = await prisma.$transaction([
    prisma.contribution.create({
      data: {
        amount,
        requestId: id,
        userId: session.user.id
      }
    }),
    prisma.request.update({
      where: { id },
      data: {
        currentFunding: (fundingRequest.currentFunding || 0) + amount
      }
    })
  ])

  return apiSuccess(contribution)
}