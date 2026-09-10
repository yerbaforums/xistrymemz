import { apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CRYPTO_RATES: Record<string, number> = {
  XMR: 1,
  XTM: 100,
  ZANO: 25,
  FUSD: 1
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { postId, replyId, amount, cryptoSymbol } = body

    if ((!postId && !replyId) || !amount || amount <= 0) {
      return apiError("Invalid parameters", 400)
    }

    const cryptoRate = CRYPTO_RATES[cryptoSymbol || 'XMR'] || 1
    const usdAmount = amount * cryptoRate

    let post = null
    let reply = null

    if (postId) {
      post = await prisma.forumPost.findUnique({
        where: { id: postId }
      })
      if (!post) {
        return apiError("Post not found", 404)
      }
    } else if (replyId) {
      reply = await prisma.forumReply.findUnique({
        where: { id: replyId }
      })
      if (!reply) {
        return apiError("Reply not found", 404)
      }
    }

    await prisma.$transaction([
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

    return NextResponse.json({ success: true, amount: usdAmount, cryptoSymbol })
  } catch (error) {
    console.error('Error tipping:', error)
    return apiError("Failed to tip", 500)
  }
}