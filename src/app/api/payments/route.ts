import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculatePlatformFee, calculateNetAmount } from '@/lib/payments'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, amount, eventId, productId, planId, description, fromAddress, toAddress } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const platformFee = calculatePlatformFee(amount)
    const netAmount = calculateNetAmount(amount)

    const payment = await prisma.payment.create({
      data: {
        type: type || 'PURCHASE',
        amount,
        platformFee,
        netAmount,
        currency: 'USD',
        status: 'COMPLETED',
        userId: session.user.id,
        eventId: eventId || null,
        productId: productId || null,
        planId: planId || null,
        description: description || null,
        fromAddress: fromAddress || null,
        toAddress: toAddress || null
      }
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        amount: payment.amount,
        platformFee: payment.platformFee,
        netAmount: payment.netAmount,
        status: payment.status
      },
      breakdown: {
        total: amount,
        platformFee: `${platformFee} (10%)`,
        sellerReceives: netAmount
      }
    })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const where = userId ? { userId } : { userId: session.user.id }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)
    const totalFees = payments.reduce((sum, p) => sum + p.platformFee, 0)

    return NextResponse.json({
      payments,
      summary: {
        totalTransactions: payments.length,
        totalRevenue,
        platformFees: totalFees,
        netPaid: totalRevenue - totalFees
      }
    })
  } catch (error) {
    console.error('Get payments error:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}
