import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { productId, amount } = await request.json()

    if (!productId || !amount || amount <= 0) {
      return apiError("Invalid request", 400)
    }

    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return apiError("Product not found", 404)
    }

    if (!product.acceptsRequests) {
      return apiError("This product does not accept requests", 400)
    }

    const contribution = await prisma.payment.create({
      data: {
        type: 'PRODUCT_CONTRIBUTION',
        amount: amount,
        currency: 'USD',
        status: 'COMPLETED',
        userId: session.user.id,
        productId: productId,
        description: `Contribution to product request: ${product.title}`
      }
    })

    const contributions = await prisma.payment.findMany({
      where: {
        productId: productId,
        type: 'PRODUCT_CONTRIBUTION',
        status: 'COMPLETED'
      }
    })

    const currentFunding = contributions.reduce((sum, c) => sum + c.amount, 0)

    if (currentFunding >= (product.requestPrice || 0)) {
      await prisma.product.update({
        where: { id: productId },
        data: { published: false }
      })
    }

    return NextResponse.json({
      success: true,
      contributionId: contribution.id,
      currentFunding
    })
  } catch (error) {
    console.error('Fund product error:', error)
    return apiError("Failed to process contribution", 500)
  }
}