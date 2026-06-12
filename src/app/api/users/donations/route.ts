import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (userId) {
      const addresses = await prisma.donationAddress.findMany({
        where: { userId, isPublic: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
      })
      return apiSuccess({ addresses })
    }

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const addresses = await prisma.donationAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })

    return apiSuccess({ addresses })
  } catch (error) {
    console.error('Error fetching donation addresses:', error)
    return apiError("Failed to fetch donation addresses", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const { currency, address, label, qrCodeUrl, showQR, sortOrder } = body

    if (!currency || !address) {
      return apiError("Currency and address are required", 400)
    }

    const donationAddress = await prisma.donationAddress.create({
      data: {
        userId: session.user.id,
        currency,
        address,
        label: label || null,
        isPublic: true,
        qrCodeUrl: qrCodeUrl || null,
        showQR: showQR !== undefined ? showQR : true,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json({ donationAddress }, { status: 201 })
  } catch (error) {
    console.error('Error creating donation address:', error)
    return apiError("Failed to create donation address", 500)
  }
}
