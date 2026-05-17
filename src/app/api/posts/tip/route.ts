import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CRYPTO_RATES: Record<string, number> = {
  XMR: 1, XTM: 100, ARRR: 200, DERO: 50, ZANO: 25,
  USDT: 1, USDC: 1, ETH: 2000, BTC: 50000
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, amount, cryptoSymbol } = body

    if (!postId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const cryptoRate = CRYPTO_RATES[cryptoSymbol || 'USDT'] || 1
    const usdAmount = amount * cryptoRate

    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || user.balance < usdAmount) {
      return NextResponse.json({ error: 'Insufficient balance', required: usdAmount, available: user?.balance || 0 }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: usdAmount } }
      }),
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

    return NextResponse.json({ success: true, amount: usdAmount, cryptoSymbol, newBalance: (user.balance || 0) - usdAmount })
  } catch (error) {
    console.error('Error tipping post:', error)
    return NextResponse.json({ error: 'Failed to tip' }, { status: 500 })
  }
}
