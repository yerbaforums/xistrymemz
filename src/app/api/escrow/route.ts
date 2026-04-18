import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWallet } from '@/lib/wallet'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where = {}
    
    if (type === 'asBuyer') {
      Object.assign(where, { buyerId: session.user.id })
    } else if (type === 'asSeller') {
      Object.assign(where, { sellerId: session.user.id })
    } else if (type === 'asCourier') {
      Object.assign(where, { courierId: session.user.id })
    } else {
      Object.assign(where, { 
        OR: [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
          { courierId: session.user.id }
        ]
      })
    }

    const transactions = await prisma.escrowTransaction.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, email: true, image: true } },
        seller: { select: { id: true, name: true, email: true, image: true } },
        courier: { select: { id: true, name: true, email: true, image: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Error fetching escrow transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

const body = await request.json()
  const { 
    sellerId, 
    amount, 
    currency, 
    productId, 
    description,
    courierId,
    courierFee,
    courierService,
    deliveryAddress,
    cryptoCurrency,
    paymentType
  } = body

  if (!sellerId || !amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (session.user.id === sellerId) {
    return NextResponse.json({ error: 'Cannot create escrow with yourself' }, { status: 400 })
  }

  const cryptoType = cryptoCurrency || 'ETH'
  const paymentAddress = cryptoCurrency ? generateWallet(cryptoType).address : null

  const directFee = parseFloat(process.env.SITE_DIRECT_FEE || '5')
  const escrowFee = parseFloat(process.env.SITE_ESCROW_FEE || '10')
  const feePercent = paymentType === 'DIRECT' ? directFee : escrowFee
  const platformFee = amount * (feePercent / 100)
  const netAmount = amount - platformFee

  const transaction = await prisma.escrowTransaction.create({
    data: {
      amount,
      currency: currency || 'USD',
      cryptoCurrency: cryptoCurrency || null,
      cryptoAmount: cryptoCurrency ? amount : null,
      feePercent,
      platformFee,
      netAmount,
      description,
      productId: productId || null,
      sellerId,
      buyerId: session.user.id,
      courierId: courierId || null,
      courierFee: courierFee || null,
      courierService: courierService || null,
      deliveryAddress: deliveryAddress || null,
      paymentAddress,
      paymentType: paymentType || 'ESCROW',
      status: paymentType === 'DIRECT' ? 'PENDING' : 'PENDING'
    },
      include: {
        buyer: { select: { id: true, name: true, email: true, image: true } },
        seller: { select: { id: true, name: true, email: true, image: true } },
        courier: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Error creating escrow:', error)
    return NextResponse.json({ error: 'Failed to create escrow' }, { status: 500 })
  }
}