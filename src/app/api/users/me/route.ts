import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [user, links] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          location: true,
          neighborhood: true,
          latitude: true,
          longitude: true,
          searchRadius: true,
          website: true,
          walletAddress: true,
          paymentAddress: true,
          refundAddress: true,
          cryptoCurrency: true,
          role: true,
          userClass: true,
          createdAt: true,
          donationAddress: true,
          donationCurrency: true,
          acceptsDonations: true
        }
      }),
      prisma.userLink.findMany({
        where: { userId: session.user.id },
        orderBy: { sortOrder: 'asc' }
      })
    ])

    return NextResponse.json({ user, links })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      name, bio, location, neighborhood, searchRadius, website, userClass,
      walletAddress, paymentAddress, refundAddress, cryptoCurrency,
      donationAddress, donationCurrency, acceptsDonations
    } = await request.json()

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        bio: bio || null,
        location: location || null,
        neighborhood: neighborhood || null,
        searchRadius: searchRadius || 50,
        website: website || null,
        walletAddress: walletAddress || null,
        paymentAddress: paymentAddress || null,
        refundAddress: refundAddress || null,
        cryptoCurrency: cryptoCurrency || 'ETH',
        userClass: userClass || null,
        donationAddress: donationAddress || null,
        donationCurrency: donationCurrency || 'ETH',
        acceptsDonations: acceptsDonations ?? false
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        bio: true,
        location: true,
        neighborhood: true,
        searchRadius: true,
        website: true,
        walletAddress: true,
        paymentAddress: true,
        refundAddress: true,
        cryptoCurrency: true,
        userClass: true,
        donationAddress: true,
        donationCurrency: true,
        acceptsDonations: true,
        createdAt: true
      }
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
