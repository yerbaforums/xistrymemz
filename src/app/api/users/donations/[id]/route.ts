import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
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
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.donationAddress.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return apiError("Not found", 404)
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

    return apiSuccess({ donationAddress: updated })
  } catch (error) {
    console.error('Error updating donation address:', error)
    return apiError("Failed to update donation address", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const existing = await prisma.donationAddress.findUnique({ where: { id } })
    if (!existing || existing.userId !== session.user.id) {
      return apiError("Not found", 404)
    }

    await prisma.donationAddress.delete({ where: { id } })

    return apiSuccess({ message: 'Deleted' })
  } catch (error) {
    console.error('Error deleting donation address:', error)
    return apiError("Failed to delete donation address", 500)
  }
}
