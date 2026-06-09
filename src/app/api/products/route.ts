import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'
import { productSchema, validateBody } from '@/lib/schemas'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const type = searchParams.get('type')
    const location = searchParams.get('location')
    const shopSlug = searchParams.get('shopSlug')
    const userId = searchParams.get('userId')
    const localOnly = searchParams.get('localOnly') === 'true'
    const userLat = searchParams.get('lat')
    const userLng = searchParams.get('lng')
    const radius = searchParams.get('radius')
    const pinned = searchParams.get('pinned')
    const hashtag = searchParams.get('hashtag')
    const limit = searchParams.get('limit')
    const rawPage = searchParams.get('page')
    const rawPageSize = searchParams.get('pageSize')

    let page = 1
    let pageSize = 20

    if (rawPage !== null || rawPageSize !== null) {
      page = Math.max(1, parseInt(rawPage || '1'))
      pageSize = Math.min(100, Math.max(1, parseInt(rawPageSize || '20')))
    } else if (limit !== null) {
      pageSize = Math.min(100, Math.max(1, parseInt(limit)))
    }

    const skip = (page - 1) * pageSize

    const session = await getServerSession(authOptions)
    let userLocation = null
    let userRadius = 50

    if (session?.user?.id) {
      userLocation = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { latitude: true, longitude: true, searchRadius: true }
      })
      if (userLocation?.searchRadius) {
        userRadius = userLocation.searchRadius
      }
    }

    const searchRadius = radius ? parseFloat(radius) : userRadius

    const where: { published: boolean; pinned?: boolean; category?: string; type?: string | { not: string } | { notIn: string[] }; location?: string; user?: { shopSlug: string }; userId?: string; OR?: Record<string, unknown>[] } = { published: true, type: { notIn: ['SERVICE', 'RENTAL'] } }

    if (category && category !== 'ALL') {
      where.category = category
    }
    if (type && type !== 'ALL') {
      where.type = type
    }
    if (location && location !== 'ALL') {
      where.location = location
    }
    if (shopSlug) {
      where.user = { shopSlug }
    }
    if (userId) {
      where.userId = userId
    }
    if (pinned === 'true') {
      where.pinned = true
    }

    const [dbProducts, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: pageSize,
        skip,
        include: {
          user: { select: { name: true, location: true, neighborhood: true, shopSlug: true } },
          hashtags: { include: { hashtag: { select: { id: true, tag: true } } } },
        },
        orderBy: [
          { pinned: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.product.count({ where }),
    ])

    let products = dbProducts

    if (hashtag) {
      products = products.filter(p =>
        p.hashtags?.some(ph => ph.hashtag.tag === hashtag.toLowerCase())
      )
    }

    let filteredProducts = products
    if (localOnly && (userLat || userLocation?.latitude)) {
      const lat = userLat ? parseFloat(userLat) : userLocation?.latitude
      const lng = userLng ? parseFloat(userLng) : userLocation?.longitude

      if (lat && lng) {
        filteredProducts = products.filter(p => {
          if (p.isGlobal || p.isRemote) return true
          if (!p.latitude || !p.longitude) return true
          const distance = calculateDistance(lat, lng, p.latitude, p.longitude)
          return distance <= searchRadius
        })
      }
    }

    return NextResponse.json({
      items: filteredProducts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('GET /api/products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = validateBody(productSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { 
      title, description, price, type, category, condition,
      location, locationDetails, isGlobal, isRemote, imageUrl,
      paymentMethods, paymentType, acceptsRequests, acceptsOffers, requestPrice, published,
      rentalDaily, rentalWeekly, rentalMonthly, rentalDeposit,
      rentalMinDays, rentalMaxDays, rentalAvailable,
      acceptsDonations, donationAddress, donationCurrency, donationAddresses,
      sellerPayoutAddress, sellerCryptoCurrency,
      createGroup, hashtags,
      acceptsAppointments, appointmentDuration, appointmentLeadTime, appointmentLocation, appointmentMeetingLink, appointmentFormFields
    } = validation.data

    const paymentMethodsString = paymentMethods ? 
      (Array.isArray(paymentMethods) ? paymentMethods.join(',') : String(paymentMethods)) 
      : ''

    const product = await prisma.product.create({
      data: {
        title: title || 'Untitled',
        description,
        price: price || null,
        type: type || 'PRODUCT',
        category,
        condition,
        location: location || 'GLOBAL',
        locationDetails,
        isGlobal: isGlobal ?? false,
        isRemote: isRemote ?? false,
        imageUrl,
        paymentMethods: paymentMethodsString,
        paymentType: paymentType || 'BOTH',
        acceptsRequests: acceptsRequests ?? false,
        acceptsOffers: acceptsOffers ?? true,
        requestPrice: requestPrice || null,
        published: published ?? true,
        rentalDaily: rentalDaily || null,
        rentalWeekly: rentalWeekly || null,
        rentalMonthly: rentalMonthly || null,
        rentalDeposit: rentalDeposit || null,
        rentalMinDays: rentalMinDays ?? 1,
        rentalMaxDays: rentalMaxDays || null,
        rentalAvailable: rentalAvailable ?? true,
        acceptsDonations: acceptsDonations ?? false,
        donationAddress: donationAddress || null,
        donationCurrency: donationCurrency || 'ETH',
        donationAddresses: donationAddresses || null,
        sellerPayoutAddress: sellerPayoutAddress || null,
        sellerCryptoCurrency: sellerCryptoCurrency || 'ETH',
        acceptsAppointments: acceptsAppointments ?? false,
        appointmentDuration: appointmentDuration || null,
        appointmentLeadTime: appointmentLeadTime || null,
        appointmentLocation: appointmentLocation || null,
        appointmentMeetingLink: appointmentMeetingLink || null,
        appointmentFormFields: appointmentFormFields || undefined,
        userId: session.user.id
      }
    })

    if (createGroup) {
      const groupName = `${title || 'Untitled'} Discussion`
      const group = await prisma.group.create({
        data: {
          name: groupName,
          description: `Community discussion group for: ${title || 'Untitled'}. ${description || ''}`,
          isLocationBased: !!location,
          location: location || null,
          userId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: 'ADMIN'
            }
          }
        }
      })
      await prisma.groupProduct.create({
        data: {
          groupId: group.id,
          productId: product.id,
          addedBy: session.user.id
        }
      })
      return NextResponse.json({ ...product, _group: group })
    }

    const allTags = [...new Set([
      ...(hashtags || []),
      ...extractHashtags([title, description || ''].join(' '))
    ])]

    if (allTags.length > 0) {
      await linkHashtags('PRODUCT', product.id, allTags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: allTags } },
        data: { postCount: { increment: 1 } },
      })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('POST /api/products:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to create product: ${errorMessage}` }, { status: 500 })
  }
}
