import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const transaction = await prisma.escrowTransaction.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true, email: true, image: true } },
        seller: { select: { id: true, name: true, email: true, image: true } },
        courier: { select: { id: true, name: true, email: true, image: true } },
        product: { select: { id: true, title: true, imageUrl: true, description: true } }
      }
    })

    if (!transaction) {
      return apiError("Transaction not found", 404)
    }

    // Check if user is part of this transaction
    if (
      transaction.buyerId !== session.user.id &&
      transaction.sellerId !== session.user.id &&
      transaction.courierId !== session.user.id
    ) {
      return apiError("Access denied", 403)
    }

    return apiSuccess(transaction)
  } catch (error) {
    console.error('Error fetching escrow transaction:', error)
    return apiError("Failed to fetch transaction", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const transaction = await prisma.escrowTransaction.findUnique({
      where: { id }
    })

    if (!transaction) {
      return apiError("Transaction not found", 404)
    }

    const body = await request.json()
    const { 
      status, 
      txHash, 
      deliveryStatus, 
      trackingNumber,
      notes,
      action // 'fund', 'release', 'dispute', 'refund', 'confirm_delivery', 'update_notes'
    } = body

    // Validate permissions based on action
    const isBuyer = transaction.buyerId === session.user.id
    const isSeller = transaction.sellerId === session.user.id
    const isCourier = transaction.courierId === session.user.id

    let newStatus = transaction.status
    let newDeliveryStatus = transaction.deliveryStatus

    switch (action) {
      case 'fund':
        if (!isBuyer) return apiError("Only buyer can fund", 403)
        if (!txHash) return apiError("Transaction hash required", 400)
        
        // Update escrow to FUNDED
        newStatus = 'FUNDED'
        
        // Create deposit record
        await prisma.deposit.create({
          data: {
            userId: transaction.buyerId,
            cryptoType: transaction.cryptoCurrency || 'ETH',
            amount: transaction.cryptoAmount || transaction.amount,
            txHash: txHash,
            status: 'CONFIRMED',
            confirmations: 1
          }
        })
        
        // Add crypto to buyer balance (optional - depends on business logic)
        // Could also hold in escrow until release
        break
         
      case 'release':
        if (!isBuyer) return apiError("Only buyer can release", 403)
        if (transaction.status !== 'FUNDED') return apiError("Must be funded first", 400)
        
        // Update seller balance with net amount
        await prisma.user.update({
          where: { id: transaction.sellerId },
          data: {
            balance: {
              increment: transaction.netAmount
            }
          }
        })
        
        // Platform fee goes to admin wallet (would need real transfer in production)
        newStatus = 'RELEASED'
        break
         
      case 'dispute':
        if (!isBuyer && !isSeller) return apiError("Only buyer or seller", 403)
        newStatus = 'DISPUTED'
        break
         
      case 'refund':
        if (!isSeller && !isBuyer) return apiError("Only seller or buyer can refund", 403)
        
        // Refund buyer - in production would send crypto back
        newStatus = 'REFUNDED'
        break
         
case 'confirm_delivery':
        if (!isCourier) return apiError("Only courier can confirm", 403)
        newDeliveryStatus = 'DELIVERED'
        break

      case 'courier_accept':
        if (!isCourier) return apiError("Only courier can accept", 403)
        if (transaction.deliveryStatus !== 'PENDING') return apiError("Order not pending", 400)
        newDeliveryStatus = 'ACCEPTED'
        break

      case 'courier_pickup':
        if (!isCourier) return apiError("Only courier can confirm pickup", 403)
        if (transaction.deliveryStatus !== 'ACCEPTED' && transaction.deliveryStatus !== 'IN_TRANSIT') return apiError("Must accept first", 400)
        newDeliveryStatus = 'PICKED_UP'
        break

      case 'courier_decline':
        if (!isCourier) return apiError("Only courier can decline", 403)
        if (transaction.deliveryStatus !== 'PENDING') return apiError("Order not pending", 400)
        newDeliveryStatus = 'DECLINED'
        newStatus = 'CANCELLED'
        await prisma.escrowTransaction.update({
          where: { id },
          data: { courierId: null }
        })
        break
         
      case 'update_delivery':
        if (!isCourier) return apiError("Only courier can update", 403)
        if (deliveryStatus) newDeliveryStatus = deliveryStatus
        if (trackingNumber) body.trackingNumber = trackingNumber
        break

      case 'update_notes':
        if (!isBuyer && !isSeller) return apiError("Only buyer or seller can add notes", 403)
        const updated = await prisma.escrowTransaction.update({
          where: { id },
          data: { notes }
        })
        return apiSuccess(updated)
         
      default:
        if (status) newStatus = status
        if (deliveryStatus) newDeliveryStatus = deliveryStatus
    }

    const updated = await prisma.escrowTransaction.update({
      where: { id },
      data: {
        status: newStatus,
        deliveryStatus: newDeliveryStatus,
        ...(txHash && { txHash }),
        ...(trackingNumber && { trackingNumber }),
        ...(newStatus === 'RELEASED' && { completedAt: new Date() })
      },
      include: {
        buyer: { select: { id: true, name: true, email: true, image: true } },
        seller: { select: { id: true, name: true, email: true, image: true } },
        courier: { select: { id: true, name: true, email: true, image: true } }
      }
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating escrow:', error)
    return apiError("Failed to update transaction", 500)
  }
}
