import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userId, amount } = body

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot tip yourself' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const sender = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!sender || sender.balance < amount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
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
    return NextResponse.json({ error: 'Failed to tip user' }, { status: 500 })
  }
}