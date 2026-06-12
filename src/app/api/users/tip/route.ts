import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
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
    const { userId, amount } = body

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

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!sender || sender.balance < amount) {
      return apiError("Insufficient balance", 400)
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { balance: { decrement: amount } }
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      newBalance: sender.balance - amount,
      message: `Tipped ${targetUser.name || targetUser.email} successfully!`
    })
  } catch (error) {
    console.error('Error tipping user:', error)
    return apiError("Failed to tip user", 500)
  }
}