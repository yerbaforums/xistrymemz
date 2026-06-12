import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const cryptoType = searchParams.get('cryptoType')

    const where: Record<string, unknown> = { userId: session.user.id }
    if (status) where.status = status
    if (cryptoType) where.cryptoType = cryptoType

    const deposits = await prisma.deposit.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(deposits)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return apiError("Failed to fetch deposits", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const { walletId, cryptoType, amount, txHash, fromAddress } = body

    if (!cryptoType || !amount || !txHash) {
      return apiError("Missing required fields", 400)
    }

    // Check if txHash already exists
    const existingDeposit = await prisma.deposit.findUnique({
      where: { txHash }
    })

    if (existingDeposit) {
      return apiError("Transaction already recorded", 400)
    }

    const deposit = await prisma.deposit.create({
      data: {
        userId: session.user.id,
        walletId: walletId || null,
        cryptoType,
        amount,
        txHash,
        fromAddress: fromAddress || null,
        status: 'PENDING'
      }
    })

    return apiSuccess(deposit)
  } catch (error) {
    console.error('Error creating deposit:', error)
    return apiError("Failed to create deposit", 500)
  }
}