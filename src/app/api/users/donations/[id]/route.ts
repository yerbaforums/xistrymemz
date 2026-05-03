import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.donationAddress.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { currency, address, label, qrCodeUrl, showQR, sortOrder, isPublic } = body

    const updated = await prisma.donationAddress.update({
      where: { id },
      data: {
        currency: currency || existing.currency,
        address: address || existing.address,
        label: label !== undefined ? (label || null) : existing.label,
        qrCodeUrl: qrCodeUrl !== undefined ? (qrCodeUrl || null) : existing.qrCodeUrl,
        showQR: showQR !== undefined ? showQR : existing.showQR,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        isPublic: isPublic !== undefined ? isPublic : existing.isPublic
      }
    })

    return NextResponse.json({ donationAddress: updated })
  } catch (error) {
    console.error('Error updating donation address:', error)
    return NextResponse.json({ error: 'Failed to update donation address' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.donationAddress.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.donationAddress.delete({ where: { id } })

    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting donation address:', error)
    return NextResponse.json({ error: 'Failed to delete donation address' }, { status: 500 })
  }
}
