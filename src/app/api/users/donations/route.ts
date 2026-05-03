import { NextRequest, NextResponse } from 'next/server'
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
      return NextResponse.json({ addresses })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await prisma.donationAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Error fetching donation addresses:', error)
    return NextResponse.json({ error: 'Failed to fetch donation addresses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currency, address, label, qrCodeUrl, showQR, sortOrder } = body

    if (!currency || !address) {
      return NextResponse.json({ error: 'Currency and address are required' }, { status: 400 })
    }

    const donationAddress = await prisma.donationAddress.create({
      data: {
        userId: session.user.id,
        currency,
        address,
        label: label || null,
        qrCodeUrl: qrCodeUrl || null,
        showQR: showQR !== undefined ? showQR : true,
        sortOrder: sortOrder || 0
      }
    })

    return NextResponse.json({ donationAddress }, { status: 201 })
  } catch (error) {
    console.error('Error creating donation address:', error)
    return NextResponse.json({ error: 'Failed to create donation address' }, { status: 500 })
  }
}
