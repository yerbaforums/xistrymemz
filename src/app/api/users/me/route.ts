import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { profileUpdateSchema, validateBody } from '@/lib/schemas'

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
          username: true,
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
          acceptsDonations: true,
          onboardingCompleted: true,
          setupProgress: true,
          lookingForCollaborators: true,
          coverImage: true,
          coverStyle: true
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

    const body = await request.json()
    const validation = validateBody(profileUpdateSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const {
      name, username, image, bio, location, neighborhood, searchRadius, traveling, website, userClass,
      walletAddress, paymentAddress, refundAddress, cryptoCurrency,
      donationAddress, donationCurrency, acceptsDonations,
      latitude, longitude, lookingForCollaborators,
      coverImage, coverStyle
    } = validation.data

    if (username !== undefined && username !== null && username !== '') {
      const normalized = username.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (normalized) {
        const existing = await prisma.user.findFirst({
          where: {
            username: normalized,
            id: { not: session.user.id }
          }
        })
        if (existing) {
          return NextResponse.json(
            { error: 'Username already taken. Please choose a different username.' },
            { status: 400 }
          )
        }
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name || null,
        username: username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : null,
        image: image || null,
        bio: bio || null,
        location: location || null,
        neighborhood: neighborhood || null,
        searchRadius: searchRadius || 50,
        traveling: traveling || false,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        website: website || null,
        walletAddress: walletAddress || null,
        paymentAddress: paymentAddress || null,
        refundAddress: refundAddress || null,
        cryptoCurrency: cryptoCurrency || 'ETH',
        userClass: userClass || null,
        donationAddress: donationAddress || null,
        donationCurrency: donationCurrency || 'ETH',
        acceptsDonations: acceptsDonations ?? false,
        lookingForCollaborators: lookingForCollaborators ?? false,
        coverImage: coverImage ?? null,
        coverStyle: coverStyle ?? undefined
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        bio: true,
        location: true,
        neighborhood: true,
        searchRadius: true,
        traveling: true,
        latitude: true,
        longitude: true,
        website: true,
        walletAddress: true,
        paymentAddress: true,
        refundAddress: true,
        cryptoCurrency: true,
        userClass: true,
        donationAddress: true,
        donationCurrency: true,
        acceptsDonations: true,
        lookingForCollaborators: true,
        coverImage: true,
        coverStyle: true,
        createdAt: true
      }
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
