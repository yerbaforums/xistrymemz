import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SUPPORTED_CRYPTOS } from '@/lib/constants'

const CRYPTO_RATES: Record<string, number> = {
  XMR: 1, XTM: 100, ZANO: 25, FUSD: 1
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { postId, amount } = body

    if (!postId || !amount || amount <= 0) {
      return apiError("Invalid parameters", 400)
    }

    const cryptoSymbol = typeof body.cryptoSymbol === 'string' ? body.cryptoSymbol.toUpperCase() : 'XMR'
    if (!SUPPORTED_CRYPTOS.includes(cryptoSymbol)) {
      return apiError("Unsupported currency", 400)
    }
    const cryptoRate = CRYPTO_RATES[cryptoSymbol] ?? 1
    const usdAmount = amount * cryptoRate

    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    if (!post) {
      return apiError("Post not found", 404)
    }

    await prisma.$transaction([
      prisma.post.update({
        where: { id: postId },
        data: {
          totalTips: { increment: usdAmount },
          tippers: { increment: 1 }
        }
      }),
      prisma.postTip.create({
        data: {
          postId,
          userId: session.user.id,
          amount: usdAmount
        }
      })
    ])

    return NextResponse.json({ success: true, amount: usdAmount, cryptoSymbol })
  } catch (error) {
    console.error('Error tipping post:', error)
    return apiError("Failed to tip", 500)
  }
}
