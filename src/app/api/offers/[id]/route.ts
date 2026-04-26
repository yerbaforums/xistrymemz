import { NextResponse } from 'next/server'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const offer = await prisma.barterOffer.findUnique({
      where: { id },
      include: {
        maker: { select: { id: true, name: true, image: true, location: true, email: true } },
        receiver: { select: { id: true, name: true, image: true, location: true, email: true } }
      }
    })

    if (!offer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (offer.makerId !== session.user.id && offer.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to view this offer' }, { status: 403 })
    }

    return NextResponse.json(offer)
  } catch (error) {
    console.error('Error fetching offer:', error)
    return NextResponse.json({ error: 'Failed to fetch offer' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    const isMaker = existingOffer.makerId === session.user.id
    const isReceiver = existingOffer.receiverId === session.user.id

    if (!isMaker && !isReceiver) {
      return NextResponse.json({ error: 'Not authorized to update this offer' }, { status: 403 })
    }

    if (existingOffer.status !== 'PENDING' && existingOffer.status !== 'COUNTERED') {
      return NextResponse.json({ error: 'Cannot update offer with current status' }, { status: 400 })
    }

    if (status === 'WITHDRAWN' && !isMaker) {
      return NextResponse.json({ error: 'Only the maker can withdraw the offer' }, { status: 400 })
    }

    if ((status === 'ACCEPTED' || status === 'REJECTED') && !isReceiver) {
      return NextResponse.json({ error: 'Only the receiver can accept or reject the offer' }, { status: 400 })
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

    if (status === 'ACCEPTED' || status === 'REJECTED') {
      const receiver = await prisma.user.findUnique({
        where: { id: existingOffer.receiverId },
        select: { name: true }
      })

      await prisma.notification.create({
        data: {
          type: status === 'ACCEPTED' ? 'OFFER_ACCEPTED' : 'OFFER_REJECTED',
          title: status === 'ACCEPTED' ? 'Offer Accepted!' : 'Offer Rejected',
          message: `${receiver?.name || 'The owner'} ${status === 'ACCEPTED' ? 'accepted' : 'rejected'} your offer on "${existingOffer.listingTitle}"`,
          link: `/offers/${id}`,
          userId: existingOffer.makerId,
          relatedId: id
        }
      })
    }

    return NextResponse.json(updatedOffer)
  } catch (error) {
    console.error('Error updating offer:', error)
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingOffer = await prisma.barterOffer.findUnique({
      where: { id }
    })

    if (!existingOffer) {
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
    }

    if (existingOffer.makerId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this offer' }, { status: 403 })
    }

    if (existingOffer.status !== 'PENDING' && existingOffer.status !== 'COUNTERED') {
      return NextResponse.json({ error: 'Cannot delete offer with current status' }, { status: 400 })
    }

    await prisma.barterOffer.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Offer deleted successfully' })
  } catch (error) {
    console.error('Error deleting offer:', error)
    return NextResponse.json({ error: 'Failed to delete offer' }, { status: 500 })
  }
}