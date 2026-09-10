import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    const body = await req.json()
    const { userId, amount, currency } = body

    if (!userId || !amount || amount <= 0) {
      return apiError("Invalid parameters", 400)
    }

    if (userId === session.user.id) {
      return apiError("Cannot tip yourself", 400)
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return apiError("User not found", 404)
    }

    await prisma.entityTip.create({
      data: {
        userId: session.user.id,
        entityType: 'USER',
        entityId: userId,
        amount: Number(amount),
        currency: currency || 'XTM'
      }
    })

    return NextResponse.json({
      success: true,
      amount: Number(amount),
      currency: currency || 'XTM',
      message: `Donation of ${amount} ${currency || 'XTM'} recorded for ${targetUser.name || targetUser.email}!`
    })
  } catch (error) {
    console.error('Error recording tip:', error)
    return apiError("Failed to record tip", 500)
  }
}