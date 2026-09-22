import { apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const orderInclude = {
  buyer: { select: { id: true, name: true, username: true, image: true, donationAddress: true } },
  seller: { select: { id: true, name: true, username: true, image: true, shopSlug: true, donationAddress: true } },
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

    const isRental = !!order.rentalStart

    switch (action) {
      case 'handover': {
        if (!isRental) {
          return apiError('Handover is only for rental orders', 400)
        }
        if (order.sellerId !== session.user.id) {
          return apiError('Only the seller can confirm handover', 400)
        }
        if (order.status !== 'PAID') {
          return apiError('Order must be PAID to hand over', 400)
        }
        updateData.status = 'ACTIVE'
        break
      }
      case 'return_item': {
        if (!isRental) {
          return apiError('Return is only for rental orders', 400)
        }
        if (order.buyerId !== session.user.id) {
          return apiError('Only the renter can mark an item as returned', 400)
        }
        if (order.status !== 'ACTIVE') {
          return apiError('Rental must be ACTIVE to return', 400)
        }
        updateData.status = 'RETURNED'
        break
      }
      case 'complete_return': {
        if (!isRental) {
          return apiError('Return completion is only for rental orders', 400)
        }
        if (order.sellerId !== session.user.id) {
          return apiError('Only the seller can complete a return', 400)
        }
        if (order.status !== 'RETURNED') {
          return apiError('Rental must be RETURNED to complete', 400)
        }
        updateData.status = 'DELIVERED'
        updateData.completedAt = new Date()
        break
      }
      case 'accept_order': {
        if (order.sellerId !== session.user.id) {
          return apiError('Only the seller can accept an order', 400)
        }
        if (order.status !== 'PENDING') {
          return apiError('Order must be PENDING to accept', 400)
        }
        updateData.acceptedAt = new Date()
        break
      }
      case 'decline_order': {
        if (order.sellerId !== session.user.id) {
          return apiError('Only the seller can decline an order', 400)
        }
        if (order.status !== 'PENDING') {
          return apiError('Order must be PENDING to decline', 400)
        }
        updateData.status = 'CANCELLED'
        if (notes) updateData.notes = notes
        break
      }
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
        if (isRental) {
          return apiError('Rental orders use handover instead of shipping', 400)
        }
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
        if (isRental) {
          return apiError('Rental orders use the return flow instead', 400)
        }
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

    // Notify the counterparty (pref-gated inside; never fails the update).
    try {
      const actorId = session.user.id as string
      const note = orderNotificationFor(action, updatedOrder.id, actorId === updatedOrder.buyerId ? 'buyer' : 'seller')
      if (note) {
        const targetId = actorId === updatedOrder.buyerId ? updatedOrder.sellerId : updatedOrder.buyerId
        await createNotification({
          type: 'ORDER_UPDATE',
          userId: targetId,
          actorId,
          entityId: updatedOrder.id,
          entityType: 'ORDER',
          title: note.title,
          message: note.message,
          link: `/orders/${updatedOrder.id}`,
        }).catch(() => null)
      }
    } catch { /* notifications never fail order updates */ }

    return NextResponse.json({ success: true, order: updatedOrder })
  } catch (error) {
    console.error('Error updating order:', error)
    return apiServerError(error)
  }
}
function orderNotificationFor(
  action: string,
  orderId: string,
  actorRole: 'buyer' | 'seller',
): { title: string; message: string } | null {
  const short = orderId.slice(0, 8)
  switch (action) {
    case 'mark_paid':
      return { title: 'Order paid', message: `The buyer marked order #${short} as paid — please verify and ship.` }
    case 'accept_order':
      return { title: 'Order accepted', message: `Good news — the seller accepted your order. Please complete payment.` }
    case 'decline_order':
      return { title: 'Order declined', message: 'The seller declined this order. Your money was never moved — no action needed.' }
    case 'ship':
      return { title: 'Order shipped', message: 'Your order is on its way — confirm receipt when it arrives.' }
    case 'deliver':
      return { title: 'Order completed', message: 'The buyer confirmed delivery. Consider leaving a review.' }
    case 'cancel':
      return {
        title: 'Order cancelled',
        message: actorRole === 'buyer' ? 'The buyer cancelled this order.' : 'The seller cancelled this order.',
      }
    case 'courier_accept':
      return { title: 'Courier accepted', message: 'The courier accepted your delivery.' }
    case 'courier_pickup':
      return { title: 'Courier picked up', message: 'Your package was picked up and is in transit.' }
    case 'courier_delivered':
      return { title: 'Courier delivered', message: 'The courier marked your package as delivered.' }
    case 'handover':
      return { title: 'Rental handed over', message: 'The seller confirmed handover — enjoy your rental!' }
    case 'return_item':
      return { title: 'Rental returned', message: 'The renter marked the item as returned — please confirm its condition.' }
    case 'complete_return':
      return { title: 'Rental completed', message: 'The return was accepted. Consider leaving a review.' }
    default:
      return null
  }
}
