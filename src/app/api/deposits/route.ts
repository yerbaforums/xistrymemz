import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json(deposits)
  } catch (error) {
    console.error('Error fetching deposits:', error)
    return NextResponse.json({ error: 'Failed to fetch deposits' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { walletId, cryptoType, amount, txHash, fromAddress } = body

    if (!cryptoType || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if txHash already exists
    const existingDeposit = await prisma.deposit.findUnique({
      where: { txHash }
    })

    if (existingDeposit) {
      return NextResponse.json({ error: 'Transaction already recorded' }, { status: 400 })
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

    return NextResponse.json(deposit)
  } catch (error) {
    console.error('Error creating deposit:', error)
    return NextResponse.json({ error: 'Failed to create deposit' }, { status: 500 })
  }
}