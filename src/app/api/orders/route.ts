import { apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const sellerId = typeof body.sellerId === 'string' ? body.sellerId : ''
    const productId = typeof body.productId === 'string' ? body.productId : undefined
    const description = typeof body.description === 'string' ? body.description : undefined
    const notes = typeof body.notes === 'string' ? body.notes : undefined
    const amount = typeof body.amount === 'number' ? body.amount : NaN
    const currency = typeof body.currency === 'string' ? body.currency : 'USD'
    const sellerPayoutAddress = typeof body.sellerPayoutAddress === 'string' ? body.sellerPayoutAddress : undefined
    const sellerPayoutCurrency = typeof body.sellerPayoutCurrency === 'string' ? body.sellerPayoutCurrency : undefined
    const deliveryAddress = typeof body.deliveryAddress === 'string' ? body.deliveryAddress : undefined
    const courierServiceId = typeof body.courierServiceId === 'string' ? body.courierServiceId : undefined

    if (!sellerId) {
      return apiError('Seller is required', 400)
    }
    if (!amount || amount <= 0) {
      return apiError('Amount must be greater than 0', 400)
    }
    if (sellerId === session.user.id) {
      return apiError('Cannot create an order for yourself', 400)
    }

    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: { id: true }
    })

    if (!seller) {
      return apiError('Seller not found', 400)
    }

    let courierId: string | undefined
    let courierFee: number | undefined
    let courierStatus: string | undefined

    if (courierServiceId) {
      const service = await prisma.courierService.findUnique({
        where: { id: courierServiceId },
        select: { id: true, basePrice: true, userId: true }
      })

      if (!service) {
        return apiError('Courier service not found', 400)
      }

      courierId = service.userId
      courierFee = service.basePrice
      courierStatus = 'REQUESTED'
    }

    const order = await prisma.order.create({
      data: {
        sellerId,
        buyerId: session.user.id,
        productId: productId ?? null,
        description: description ?? null,
        notes: notes ?? null,
        amount,
        currency,
        sellerPayoutAddress: sellerPayoutAddress ?? null,
        sellerPayoutCurrency: sellerPayoutCurrency ?? null,
        deliveryAddress: deliveryAddress ?? null,
        status: 'PENDING',
        courierServiceId: courierServiceId ?? null,
        courierId: courierId ?? null,
        courierFee: courierFee ?? null,
        courierStatus: courierStatus ?? null
      }
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return apiServerError(error)
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const isAdmin = session.user.role === 'ADMIN'
    const bypassUserFilter = searchParams.get('admin') === 'true' && isAdmin

    let where: Prisma.OrderWhereInput = {}

    if (!bypassUserFilter) {
      if (type === 'buyer') {
        where.buyerId = session.user.id
      } else if (type === 'seller') {
        where.sellerId = session.user.id
      } else if (type === 'courier') {
        where.courierId = session.user.id
      } else {
        where.OR = [
          { buyerId: session.user.id },
          { sellerId: session.user.id },
          { courierId: session.user.id }
        ]
      }
    }

    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        description: true,
        notes: true,
        sellerPayoutAddress: true,
        sellerPayoutCurrency: true,
        courierStatus: true,
        courierFee: true,
        deliveryAddress: true,
        trackingNumber: true,
        completedAt: true,
        createdAt: true,
        buyer: { select: { id: true, name: true, username: true, image: true } },
        seller: { select: { id: true, name: true, username: true, image: true, shopSlug: true } },
        product: { select: { id: true, title: true } },
        courierService: { select: { id: true, name: true, serviceType: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return apiServerError(error)
  }
}