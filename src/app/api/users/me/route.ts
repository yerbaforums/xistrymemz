import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { profileUpdateSchema, validateBody } from '@/lib/schemas'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
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
          coverStyle: true,
          traveling: true,
          showShop: true,
          showSchool: true,
          enableTips: true,
          enableReplies: true,
          enableLikes: true,
          showViewCount: true
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
    return apiError("Failed to fetch user", 500)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
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
      coverImage, coverStyle,
      showShop, showSchool, enableTips, enableReplies, enableLikes, showViewCount
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

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name || null
    if (username !== undefined) updateData.username = username ? username.toLowerCase().replace(/[^a-z0-9]/g, '') : null
    if (image !== undefined) updateData.image = image || null
    if (bio !== undefined) updateData.bio = bio || null
    if (location !== undefined) updateData.location = location || null
    if (neighborhood !== undefined) updateData.neighborhood = neighborhood || null
    if (searchRadius !== undefined) updateData.searchRadius = searchRadius || 50
    if (traveling !== undefined) updateData.traveling = traveling || false
    if (latitude !== undefined) updateData.latitude = latitude ?? null
    if (longitude !== undefined) updateData.longitude = longitude ?? null
    if (website !== undefined) updateData.website = website || null
    if (walletAddress !== undefined) updateData.walletAddress = walletAddress || null
    if (paymentAddress !== undefined) updateData.paymentAddress = paymentAddress || null
    if (refundAddress !== undefined) updateData.refundAddress = refundAddress || null
    if (cryptoCurrency !== undefined) updateData.cryptoCurrency = cryptoCurrency || 'ETH'
    if (userClass !== undefined) updateData.userClass = userClass || null
    if (donationAddress !== undefined) updateData.donationAddress = donationAddress || null
    if (donationCurrency !== undefined) updateData.donationCurrency = donationCurrency || 'ETH'
    if (acceptsDonations !== undefined) updateData.acceptsDonations = acceptsDonations ?? false
    if (lookingForCollaborators !== undefined) updateData.lookingForCollaborators = lookingForCollaborators ?? false
    if (coverImage !== undefined) updateData.coverImage = coverImage ?? null
    if (coverStyle !== undefined) updateData.coverStyle = coverStyle ?? undefined
    if (showShop !== undefined) updateData.showShop = showShop ?? true
    if (showSchool !== undefined) updateData.showSchool = showSchool ?? true
    if (enableTips !== undefined) updateData.enableTips = enableTips ?? true
    if (enableReplies !== undefined) updateData.enableReplies = enableReplies ?? true
    if (enableLikes !== undefined) updateData.enableLikes = enableLikes ?? true
    if (showViewCount !== undefined) updateData.showViewCount = showViewCount ?? true

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
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
        showShop: true,
        showSchool: true,
        enableTips: true,
        enableReplies: true,
        enableLikes: true,
        showViewCount: true,
        createdAt: true
      }
    })

    return apiSuccess({ user: updated })
  } catch (error) {
    console.error('Error updating user:', error)
    return apiError("Failed to update user", 500)
  }
}
