import { apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const orderInclude = {
  buyer: { select: { id: true, name: true, username: true, image: true, email: true, donationAddress: true } },
  seller: { select: { id: true, name: true, username: true, image: true, shopSlug: true, email: true, donationAddress: true } },
  product: { select: { id: true, title: true, description: true, imageUrl: true, sellerPayoutAddress: true, sellerCryptoCurrency: true } },
  courierService: { select: { id: true, name: true, serviceType: true, basePrice: true, availableAreas: true } }
} satisfies Prisma.OrderInclude

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude
    })

    if (!order) {
      return apiError('Order not found', 404)
    }

    const isParticipant =
      order.buyerId === session.user.id ||
      order.sellerId === session.user.id ||
      order.courierId === session.user.id

    if (!isParticipant && session.user.role !== 'ADMIN') {
      return apiError('Not authorized to view this order', 400)
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Error fetching order:', error)
    return apiServerError(error)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError('Unauthorized', 401)
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id }
    })

    if (!order) {
      return apiError('Order not found', 404)
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return apiError('Invalid JSON body', 400)
    }

    const action = typeof body.action === 'string' ? body.action : ''
    const trackingNumber = typeof body.trackingNumber === 'string' ? body.trackingNumber.trim() : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''

    const updateData: Prisma.OrderUpdateInput = {}

    switch (action) {
      case 'mark_paid': {
        if (order.buyerId !== session.user.id) {
          return apiError('Only the buyer can mark an order as paid', 400)
        }
        if (order.status !== 'PENDING') {
          return apiError('Order must be PENDING to mark as paid', 400)
        }
        updateData.status = 'PAID'
        break
      }
      case 'ship': {
        if (order.sellerId !== session.user.id) {
          return apiError('Only the seller can ship an order', 400)
        }
        if (order.status !== 'PAID') {
          return apiError('Order must be PAID to ship', 400)
        }
        updateData.status = 'SHIPPED'
        break
      }
      case 'deliver': {
        if (order.buyerId !== session.user.id) {
          return apiError('Only the buyer can confirm delivery', 400)
        }
        if (order.status !== 'SHIPPED') {
          return apiError('Order must be SHIPPED to confirm delivery', 400)
        }
        updateData.status = 'DELIVERED'
        updateData.completedAt = new Date()
        break
      }
      case 'cancel': {
        const isBuyer = order.buyerId === session.user.id
        const isSeller = order.sellerId === session.user.id
        if (!isBuyer && !isSeller) {
          return apiError('Only the buyer or seller can cancel an order', 400)
        }
        if (order.status !== 'PENDING' && order.status !== 'PAID') {
          return apiError('Order must be PENDING or PAID to cancel', 400)
        }
        updateData.status = 'CANCELLED'
        break
      }
      case 'courier_accept': {
        if (order.courierId !== session.user.id) {
          return apiError('Only the assigned courier can accept a delivery', 400)
        }
        if (order.courierStatus !== 'REQUESTED') {
          return apiError('Courier delivery must be REQUESTED to accept', 400)
        }
        updateData.courierStatus = 'BOOKED'
        break
      }
      case 'courier_pickup': {
        if (order.courierId !== session.user.id) {
          return apiError('Only the assigned courier can confirm pickup', 400)
        }
        if (order.courierStatus !== 'BOOKED') {
          return apiError('Courier delivery must be BOOKED for pickup', 400)
        }
        updateData.courierStatus = 'IN_TRANSIT'
        break
      }
      case 'courier_delivered': {
        if (order.courierId !== session.user.id) {
          return apiError('Only the assigned courier can confirm delivery', 400)
        }
        if (order.courierStatus !== 'IN_TRANSIT') {
          return apiError('Courier delivery must be IN_TRANSIT to complete', 400)
        }
        updateData.courierStatus = 'DELIVERED'
        break
      }
      case 'update_tracking': {
        const isCourier = order.courierId === session.user.id
        const isSeller = order.sellerId === session.user.id
        if (!isCourier && !isSeller) {
          return apiError('Only the courier or seller can update tracking', 400)
        }
        if (!trackingNumber) {
          return apiError('trackingNumber is required', 400)
        }
        updateData.trackingNumber = trackingNumber
        break
      }
      case 'update_notes': {
        const isBuyer = order.buyerId === session.user.id
        const isSeller = order.sellerId === session.user.id
        const isCourier = order.courierId === session.user.id
        if (!isBuyer && !isSeller && !isCourier) {
          return apiError('Only participants can update order notes', 400)
        }
        updateData.notes = notes
        break
      }
      case 'admin_set_status': {
        const isAdmin = session.user.role === 'ADMIN'
        if (!isAdmin) {
          return apiError('Only admins can override order status', 400)
        }
        const status = typeof body.status === 'string' ? body.status.toUpperCase() : ''
        const allowed = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']
        if (!allowed.includes(status)) {
          return apiError('Invalid status', 400)
        }
        updateData.status = status as Prisma.OrderUpdateInput['status']
        if (status === 'DELIVERED') {
          updateData.completedAt = new Date()
        }
        break
      }
      case 'admin_set_courier': {
        const isAdmin = session.user.role === 'ADMIN'
        if (!isAdmin) {
          return apiError('Only admins can override courier status', 400)
        }
        const courierStatus = typeof body.courierStatus === 'string' ? body.courierStatus.toUpperCase() : ''
        const allowed = ['REQUESTED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'DECLINED']
        if (!allowed.includes(courierStatus)) {
          return apiError('Invalid courier status', 400)
        }
        updateData.courierStatus = courierStatus as Prisma.OrderUpdateInput['courierStatus']
        break
      }
      default:
        return apiError('Invalid action', 400)
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: orderInclude
    })

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return apiServerError(error)
  }
}