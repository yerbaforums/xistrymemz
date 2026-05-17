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
    const { title, description, startTime, endTime, status, location, meetingLink } = body

    const appointment = await prisma.appointment.findUnique({ where: { id } })
    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (appointment.buyerId !== session.user.id && appointment.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: new Date(endTime) }),
        ...(status !== undefined && { status }),
        ...(location !== undefined && { location }),
        ...(meetingLink !== undefined && { meetingLink })
      },
      include: {
        buyer: { select: { id: true, name: true, image: true, username: true } },
        seller: { select: { id: true, name: true, image: true, username: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      }
    })

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
