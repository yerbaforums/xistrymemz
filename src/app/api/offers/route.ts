import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { barterOfferCreateSchema, validateBody } from '@/lib/schemas'
import { Prisma } from '@prisma/client'
import { createNotification } from '@/services/notificationService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const listingType = searchParams.get('listingType')
    const listingId = searchParams.get('listingId')

    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const where: Prisma.BarterOfferWhereInput = {}

    if (type === 'sent') {
      where.makerId = session.user.id
    } else if (type === 'received') {
      where.receiverId = session.user.id
    } else {
      where.OR = [
        { makerId: session.user.id },
        { receiverId: session.user.id }
      ]
    }

    if (status && status !== 'ALL') {
      where.status = status
    }
    if (listingType && listingType !== 'ALL') {
      where.listingType = listingType
    }
    if (listingId) {
      where.listingId = listingId
    }

    const offers = await prisma.barterOffer.findMany({
      where,
      include: {
        maker: { select: { id: true, name: true, image: true, location: true } },
        receiver: { select: { id: true, name: true, image: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(offers)
  } catch (error) {
    console.error('Error fetching offers:', error)
    return apiError("Failed to fetch offers", 500)
  }
}

export async function POST(request: Request) {
  try {
    const { getServerSession } = await import('next-auth')
    const { authOptions } = await import('@/lib/auth')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const validation = validateBody(barterOfferCreateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { offerType, listingType, listingId, listingTitle, offeredItem, offeredValue, message } = validation.data

    let receiverId: string | null = null
    if (listingType === 'PRODUCT') {
      const product = await prisma.product.findUnique({
        where: { id: listingId },
        select: { userId: true }
      })
      receiverId = product?.userId ?? null
    } else if (listingType === 'REQUEST') {
      const req = await prisma.request.findUnique({
        where: { id: listingId },
        select: { userId: true }
      })
      receiverId = req?.userId ?? null
    } else if (listingType === 'SERVICE') {
      const svc = await prisma.serviceOffering.findUnique({
        where: { id: listingId },
        select: { userId: true }
      })
      receiverId = svc?.userId ?? null
    }

    if (!receiverId) {
      return apiError("Listing not found", 404)
    }

    if (receiverId === session.user.id) {
      return apiError("Cannot make offer on your own listing", 400)
    }

    const existingOffer = await prisma.barterOffer.findFirst({
      where: {
        makerId: session.user.id,
        listingId,
        listingType,
        status: { in: ['PENDING', 'ACCEPTED', 'COUNTERED'] }
      }
    })

    if (existingOffer) {
      return apiError("You already have an active offer on this listing", 400)
    }

    const offer = await prisma.barterOffer.create({
      data: {
        offerType,
        listingType,
        listingId,
        listingTitle,
        offeredItem,
        offeredValue,
        message,
        makerId: session.user.id,
        receiverId
      },
      include: {
        maker: { select: { id: true, name: true, image: true, location: true } },
        receiver: { select: { id: true, name: true, image: true, location: true } }
      }
    })

    const maker = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    })

    // Pref-gated: Settings → Notifications → Offers & Trades.
    try {
      await createNotification({
        type: 'OFFER_RECEIVED',
        userId: receiverId,
        actorId: session.user.id,
        entityId: offer.id,
        entityType: 'OFFER',
        title: 'New Barter Offer',
        message: `${maker?.name || 'Someone'} offered ${offeredItem} for your listing "${listingTitle}"`,
        link: `/offers/${offer.id}`,
      })
    } catch {
      // silent — offer was already created
    }

    return NextResponse.json(offer, { status: 201 })
  } catch (error) {
    console.error('Error creating offer:', error)
    return apiError("Failed to create offer", 500)
  }
}