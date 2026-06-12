import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { counterOfferSchema, validateBody } from '@/lib/schemas'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const validation = validateBody(counterOfferSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { offeredItem, offeredValue, message } = validation.data
    const { id: parentOfferId } = await params

    const original = await prisma.barterOffer.findUnique({
      where: { id: parentOfferId }
    })

    if (!original) {
      return apiError("Offer not found", 404)
    }

    if (original.receiverId !== session.user.id) {
      return apiError("Only the receiver can counter this offer", 403)
    }

    if (original.status !== 'PENDING' && original.status !== 'COUNTERED') {
      return apiError("Cannot counter an offer with this status", 400)
    }

    const counterOffer = await prisma.barterOffer.create({
      data: {
        offerType: original.offerType,
        listingType: original.listingType,
        listingId: original.listingId,
        listingTitle: original.listingTitle,
        offeredItem,
        offeredValue,
        message: message || null,
        makerId: session.user.id,
        receiverId: original.makerId,
        parentOfferId: original.id,
        status: 'PENDING'
      },
      include: {
        maker: { select: { id: true, name: true, image: true, location: true } },
        receiver: { select: { id: true, name: true, image: true, location: true } }
      }
    })

    await prisma.barterOffer.update({
      where: { id: original.id },
      data: { status: 'COUNTERED' }
    })

    const counterMaker = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    })

    await prisma.notification.create({
      data: {
        type: 'OFFER_COUNTERED',
        title: 'Counter Offer Received',
        message: `${counterMaker?.name || 'Someone'} countered your offer on "${original.listingTitle}"`,
        link: `/offers/${counterOffer.id}`,
        userId: original.makerId,
        relatedId: counterOffer.id
      }
    })

    return NextResponse.json(counterOffer, { status: 201 })
  } catch (error) {
    console.error('Error creating counter offer:', error)
    return apiError("Failed to create counter offer", 500)
  }
}
