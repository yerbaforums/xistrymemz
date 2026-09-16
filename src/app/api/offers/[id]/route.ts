import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { barterOfferUpdateSchema, validateBody } from '@/lib/schemas'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const offer = await prisma.barterOffer.findUnique({
      where: { id },
      include: {
        maker: { select: { id: true, name: true, image: true, location: true, email: true } },
        receiver: { select: { id: true, name: true, image: true, location: true, email: true } },
        counterOffers: {
          orderBy: { createdAt: 'asc' },
          include: {
            maker: { select: { id: true, name: true, image: true, location: true } },
            receiver: { select: { id: true, name: true, image: true, location: true } }
          }
        }
      }
    })

    if (!offer) {
      return apiError("Offer not found", 404)
    }

    if (offer.makerId !== session.user.id && offer.receiverId !== session.user.id) {
      return apiError("Not authorized to view this offer", 403)
    }

    return apiSuccess(offer)
  } catch (error) {
    console.error('Error fetching offer:', error)
    return apiError("Failed to fetch offer", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const validation = validateBody(barterOfferUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { status, message } = validation.data

    const existingOffer = await prisma.barterOffer.findUnique({
      where: { id }
    })

    if (!existingOffer) {
      return apiError("Offer not found", 404)
    }

    const isMaker = existingOffer.makerId === session.user.id
    const isReceiver = existingOffer.receiverId === session.user.id

    if (!isMaker && !isReceiver) {
      return apiError("Not authorized to update this offer", 403)
    }

    const isCompleteTransition = status === 'COMPLETED' && existingOffer.status === 'ACCEPTED'
    if (existingOffer.status !== 'PENDING' && existingOffer.status !== 'COUNTERED' && !isCompleteTransition) {
      return apiError("Cannot update offer with current status", 400)
    }

    if (status === 'WITHDRAWN' && !isMaker) {
      return apiError("Only the maker can withdraw the offer", 400)
    }

    if ((status === 'ACCEPTED' || status === 'REJECTED') && !isReceiver) {
      return apiError("Only the receiver can accept or reject the offer", 400)
    }

    const updateData: { status?: string; message?: string } = {}
    if (status) {
      updateData.status = status
    }
    if (message) {
      updateData.message = message
    }

    const updatedOffer = await prisma.barterOffer.update({
      where: { id },
      data: updateData,
      include: {
        maker: { select: { id: true, name: true, image: true, location: true } },
        receiver: { select: { id: true, name: true, image: true, location: true } }
      }
    })

    if (status === 'ACCEPTED' || status === 'REJECTED' || status === 'COMPLETED') {
      const notifiedUserId = isMaker ? existingOffer.receiverId : existingOffer.makerId
      const notifier = await prisma.user.findUnique({
        where: { id: isMaker ? existingOffer.makerId : existingOffer.receiverId },
        select: { name: true }
      })

      const actionLabel = status === 'ACCEPTED' ? 'accepted' : status === 'REJECTED' ? 'rejected' : 'marked your offer as complete on'
      const actionNoun = status === 'ACCEPTED' ? 'Offer Accepted!' : status === 'REJECTED' ? 'Offer Rejected' : 'Offer Completed!'

      await prisma.notification.create({
        data: {
          type: status === 'ACCEPTED' ? 'OFFER_ACCEPTED' : status === 'REJECTED' ? 'OFFER_REJECTED' : 'OFFER_COMPLETED',
          title: actionNoun,
          message: `${notifier?.name || 'The other party'} ${actionLabel} "${existingOffer.listingTitle}"`,
          link: `/offers/${id}`,
          userId: notifiedUserId,
          relatedId: id
        }
      })
    }

    return apiSuccess(updatedOffer)
  } catch (error) {
    console.error('Error updating offer:', error)
    return apiError("Failed to update offer", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const existingOffer = await prisma.barterOffer.findUnique({
      where: { id }
    })

    if (!existingOffer) {
      return apiError("Offer not found", 404)
    }

    if (existingOffer.makerId !== session.user.id) {
      return apiError("Not authorized to delete this offer", 403)
    }

    if (existingOffer.status !== 'PENDING' && existingOffer.status !== 'COUNTERED') {
      return apiError("Cannot delete offer with current status", 400)
    }

    await prisma.barterOffer.delete({
      where: { id }
    })

    return apiSuccess({ message: 'Offer deleted successfully' })
  } catch (error) {
    console.error('Error deleting offer:', error)
    return apiError("Failed to delete offer", 500)
  }
}