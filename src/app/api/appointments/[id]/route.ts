import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const userId = session.user.id

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } }
      }
    })
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const isBuyer = appointment.buyerId === userId
    const isSeller = appointment.sellerId === userId
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, title, description, startTime, endTime, location, meetingLink, declineReason } = body

    const updateData: Record<string, unknown> = {}
    let notificationData: { type: string; title: string; message: string; link: string; userId: string; relatedId: string } | null = null

    if (action === 'accept') {
      if (!isSeller) {
        return NextResponse.json({ error: 'Only the seller can accept appointments' }, { status: 403 })
      }
      if (appointment.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only pending appointments can be accepted' }, { status: 400 })
      }
      updateData.status = 'CONFIRMED'
      notificationData = {
        type: 'APPOINTMENT_CONFIRMED',
        title: 'Booking Confirmed',
        message: `${appointment.seller.name || 'Seller'} confirmed your booking for "${appointment.title}"`,
        link: `/dashboard/appointments`,
        userId: appointment.buyerId,
        relatedId: id
      }
    } else if (action === 'decline') {
      if (!isSeller) {
        return NextResponse.json({ error: 'Only the seller can decline appointments' }, { status: 403 })
      }
      if (appointment.status !== 'PENDING') {
        return NextResponse.json({ error: 'Only pending appointments can be declined' }, { status: 400 })
      }
      updateData.status = 'REJECTED'
      if (declineReason) updateData.declineReason = declineReason
      notificationData = {
        type: 'APPOINTMENT_DECLINED',
        title: 'Booking Declined',
        message: `${appointment.seller.name || 'Seller'} declined your booking for "${appointment.title}"${declineReason ? `: ${declineReason}` : ''}`,
        link: `/dashboard/appointments`,
        userId: appointment.buyerId,
        relatedId: id
      }
    } else if (action === 'cancel') {
      if (appointment.status === 'COMPLETED') {
        return NextResponse.json({ error: 'Cannot cancel a completed appointment' }, { status: 400 })
      }
      updateData.status = 'CANCELLED'
    } else if (action === 'complete') {
      if (!isSeller) {
        return NextResponse.json({ error: 'Only the seller can mark appointments as complete' }, { status: 403 })
      }
      if (appointment.status !== 'CONFIRMED') {
        return NextResponse.json({ error: 'Only confirmed appointments can be completed' }, { status: 400 })
      }
      updateData.status = 'COMPLETED'
    } else if (action === 'reschedule') {
      if (!startTime || !endTime) {
        return NextResponse.json({ error: 'New start and end times required for rescheduling' }, { status: 400 })
      }
      updateData.startTime = new Date(startTime)
      updateData.endTime = new Date(endTime)
      updateData.status = 'PENDING'
      const otherUserId = isBuyer ? appointment.sellerId : appointment.buyerId
      const otherName = isBuyer ? (appointment.seller.name || 'Seller') : (appointment.buyer.name || 'Buyer')
      notificationData = {
        type: 'APPOINTMENT_RESCHEDULED',
        title: 'Booking Rescheduled',
        message: `${otherName} rescheduled "${appointment.title}" — please review the new time`,
        link: `/dashboard/appointments`,
        userId: otherUserId,
        relatedId: id
      }
    } else {
      if (title !== undefined) updateData.title = title.trim()
      if (description !== undefined) updateData.description = description?.trim()
      if (startTime !== undefined) updateData.startTime = new Date(startTime)
      if (endTime !== undefined) updateData.endTime = new Date(endTime)
      if (location !== undefined) updateData.location = location
      if (meetingLink !== undefined) updateData.meetingLink = meetingLink
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        buyer: { select: { id: true, name: true, image: true, username: true } },
        seller: { select: { id: true, name: true, image: true, username: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      }
    })

    if (notificationData) {
      await prisma.notification.create({ data: notificationData }).catch(() => {})
    }

    return NextResponse.json({ appointment: updated })
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.buyerId !== session.user.id && appointment.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ message: 'Appointment cancelled' })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json({ error: 'Failed to cancel appointment' }, { status: 500 })
  }
}
