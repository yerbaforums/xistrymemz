import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        coverImage: true,
        bio: true,
        location: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        website: true,
        userClass: true,
        role: true,
        shopName: true,
        shopSlug: true,
        schoolName: true,
        schoolSlug: true,
        walletAddress: true,
        paymentAddress: true,
        refundAddress: true,
        cryptoCurrency: true,
        balance: true,
        earthId: true,
        verificationLevel: true,
        reputationScore: true,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedIdentity: true,
        verifiedAddress: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            plans: true,
            posts: true,
            products: true,
            requests: true,
            sentConnections: true,
            receivedConnections: true,
            escrowAsSeller: true,
            escrowAsBuyer: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}