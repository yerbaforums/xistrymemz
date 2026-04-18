import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CRYPTO_RATES: Record<string, number> = {
  XMR: 1,
  XTM: 100,
  ARRR: 200,
  DERO: 50,
  ZANO: 25,
  USDT: 1,
  USDC: 1,
  ETH: 2000,
  BTC: 50000
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { postId, replyId, amount, cryptoSymbol } = body

    if ((!postId && !replyId) || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const cryptoRate = CRYPTO_RATES[cryptoSymbol || 'USDT'] || 1
    const usdAmount = amount * cryptoRate

    let post = null
    let reply = null

    if (postId) {
      post = await prisma.forumPost.findUnique({
        where: { id: postId }
      })
      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
    } else if (replyId) {
      reply = await prisma.forumReply.findUnique({
        where: { id: replyId }
      })
      if (!reply) {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      }
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
      post ? prisma.forumPost.update({
        where: { id: postId },
        data: { 
          totalTips: { increment: usdAmount },
          tippers: { increment: 1 }
        }
      }) : prisma.forumReply.update({
        where: { id: replyId },
        data: {
          totalTips: { increment: usdAmount },
          tippers: { increment: 1 }
        }
      }),
      post ? prisma.forumPostTip.create({
        data: {
          postId,
          userId: session.user.id,
          amount: usdAmount
        }
      }) : prisma.forumReplyTip.create({
        data: {
          replyId,
          userId: session.user.id,
          amount: usdAmount
        }
      })
    ])

    return NextResponse.json({ success: true, amount: usdAmount, cryptoSymbol, newBalance: (user.balance || 0) - usdAmount })
  } catch (error) {
    console.error('Error tipping:', error)
    return NextResponse.json({ error: 'Failed to tip' }, { status: 500 })
  }
}