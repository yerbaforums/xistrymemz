import { apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateWallet } from '@/lib/wallet'
import { validateInput, escrowSchema } from '@/lib/validation'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
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

    return apiSuccess(transactions)
  } catch (error) {
    console.error('Error fetching escrow transactions:', error)
    return apiError("Failed to fetch transactions", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

const body = await request.json()
  
  const validation = validateInput(escrowSchema, body)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  
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
  } = validation.data

  if (session.user.id === sellerId) {
    return apiError("Cannot create escrow with yourself", 400)
  }

  const cryptoType = cryptoCurrency || 'ETH'
  const paymentAddress = cryptoCurrency ? generateWallet(cryptoType).address : null

  const directFee = 0
  const escrowFee = 0
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

    return apiSuccess(transaction)
  } catch (error) {
    console.error('Error creating escrow:', error)
    return apiError("Failed to create escrow", 500)
  }
}