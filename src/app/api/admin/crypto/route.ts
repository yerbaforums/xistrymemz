import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'deposits', 'wallets', 'escrows'

    if (type === 'deposits') {
      const deposits = await prisma.deposit.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
          wallet: { select: { id: true, cryptoType: true, address: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })
      return apiSuccess(deposits)
    }

    if (type === 'escrows') {
      const escrows = await prisma.escrowTransaction.findMany({
        where: { status: 'FUNDED' },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
      return apiSuccess(escrows)
    }

    // Default: get all user wallets
    const wallets = await prisma.userWallet.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    })

    return apiSuccess(wallets)
  } catch (error) {
    console.error('Error fetching admin wallet data:', error)
    return apiError("Failed to fetch data", 500)
  }
}