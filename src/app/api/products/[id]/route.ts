import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody, productSchema } from '@/lib/schemas'
import { geocodeLocation } from '@/lib/geocoding'
import { extractHashtags, linkHashtags, removeHashtags } from '@/services/hashtagService'
import { hasVerifiedEmail } from '@/lib/verified-email'
import type { Prisma } from '@prisma/client'

interface ProductUpdateBody {
  title?: string
  description?: string
  price?: string | number
  type?: string
  category?: string
  condition?: string
  location?: string
  locationDetails?: string | null
  imageUrl?: string | null
  isGlobal?: boolean
  published?: boolean
  paymentMethods?: string | string[]
  paymentType?: string
  acceptsRequests?: boolean
  acceptsOffers?: boolean
  requestPrice?: string | number
  acceptsDonations?: boolean
  donationAddress?: string | null
  donationCurrency?: string
  donationAddresses?: string | null
  sellerPayoutAddress?: string | null
  sellerCryptoCurrency?: string
  rentalDaily?: string | number
  rentalWeekly?: string | number
  rentalMonthly?: string | number
  rentalDeposit?: string | number
  rentalMinDays?: string | number
  rentalMaxDays?: string | number
  rentalAvailable?: boolean
  hashtags?: string[]
  acceptsAppointments?: boolean
  appointmentDuration?: string | number
  appointmentLeadTime?: string | number
  appointmentLocation?: string | null
  appointmentMeetingLink?: string | null
  appointmentFormFields?: Prisma.InputJsonValue | null
  customizationFields?: Prisma.InputJsonValue | null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, username: true, email: true, role: true, userClass: true } }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('GET /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    let parsedBody: unknown
    try {
      parsedBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const body: ProductUpdateBody = parsedBody as ProductUpdateBody

    const validation = validateBody(productSchema.partial(), body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, price, type, category, condition, location, locationDetails, imageUrl, isGlobal, published, paymentMethods, paymentType, acceptsRequests, acceptsOffers, requestPrice, acceptsDonations, donationAddress, donationCurrency, donationAddresses, sellerPayoutAddress, sellerCryptoCurrency, rentalDaily, rentalWeekly, rentalMonthly, rentalDeposit, rentalMinDays, rentalMaxDays, rentalAvailable, hashtags, acceptsAppointments, appointmentDuration, appointmentLeadTime, appointmentLocation, appointmentMeetingLink, appointmentFormFields, customizationFields } = body

    const existing = await prisma.product.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (published === true && !(await hasVerifiedEmail(session.user.id))) {
      return apiError('Verify your email before publishing', 403)
    }

    const paymentMethodsString = paymentMethods ? 
      (Array.isArray(paymentMethods) ? paymentMethods.join(',') : String(paymentMethods)) 
      : existing.paymentMethods

    let latitude = existing.latitude
    let longitude = existing.longitude

    if (location && location !== existing.location && !isGlobal) {
      try {
        const geocodeResult = await geocodeLocation(location)
        if (geocodeResult) {
          latitude = geocodeResult.latitude
          longitude = geocodeResult.longitude
        }
      } catch (err) {
        console.error('Geocoding error:', err)
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        price: price != null ? parseFloat(String(price)) : existing.price,
        type: type ?? existing.type,
        category: category ?? existing.category,
        condition: condition ?? existing.condition,
        location: isGlobal ? 'GLOBAL' : (location ?? existing.location),
        locationDetails: locationDetails ?? existing.locationDetails,
        latitude: latitude ?? existing.latitude,
        longitude: longitude ?? existing.longitude,
        isGlobal: isGlobal ?? existing.isGlobal,
        imageUrl: imageUrl ?? existing.imageUrl,
        published: published ?? existing.published,
        paymentMethods: paymentMethodsString,
        paymentType: paymentType ?? existing.paymentType,
        acceptsRequests: acceptsRequests ?? existing.acceptsRequests,
        acceptsOffers: acceptsOffers ?? existing.acceptsOffers,
        requestPrice: requestPrice != null ? parseFloat(String(requestPrice)) : existing.requestPrice,
        acceptsDonations: acceptsDonations ?? existing.acceptsDonations,
        donationAddress: donationAddress ?? existing.donationAddress,
        donationCurrency: donationCurrency ?? existing.donationCurrency,
        donationAddresses: donationAddresses !== undefined ? (donationAddresses || null) : existing.donationAddresses,
        sellerPayoutAddress: sellerPayoutAddress ?? existing.sellerPayoutAddress,
        sellerCryptoCurrency: sellerCryptoCurrency ?? existing.sellerCryptoCurrency,
        rentalDaily: rentalDaily != null ? parseFloat(String(rentalDaily)) : existing.rentalDaily,
        rentalWeekly: rentalWeekly != null ? parseFloat(String(rentalWeekly)) : existing.rentalWeekly,
        rentalMonthly: rentalMonthly != null ? parseFloat(String(rentalMonthly)) : existing.rentalMonthly,
        rentalDeposit: rentalDeposit != null ? parseFloat(String(rentalDeposit)) : existing.rentalDeposit,
        rentalMinDays: rentalMinDays != null ? parseInt(String(rentalMinDays)) : existing.rentalMinDays,
        rentalMaxDays: rentalMaxDays != null ? parseInt(String(rentalMaxDays)) : existing.rentalMaxDays,
        rentalAvailable: rentalAvailable ?? existing.rentalAvailable,
        acceptsAppointments: acceptsAppointments ?? existing.acceptsAppointments,
        appointmentDuration: appointmentDuration != null ? parseInt(String(appointmentDuration)) : existing.appointmentDuration,
        appointmentLeadTime: appointmentLeadTime != null ? parseInt(String(appointmentLeadTime)) : existing.appointmentLeadTime,
        appointmentLocation: appointmentLocation ?? existing.appointmentLocation,
        appointmentMeetingLink: appointmentMeetingLink ?? existing.appointmentMeetingLink,
        appointmentFormFields: (appointmentFormFields ?? existing.appointmentFormFields) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue,
        customizationFields: (customizationFields ?? existing.customizationFields) as Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue
      }
    })

    const resolvedTitle = title ?? existing.title
    const resolvedDescription = description ?? existing.description
    const allTags = [...new Set([
      ...(hashtags || []),
      ...extractHashtags([resolvedTitle, resolvedDescription || ''].join(' '))
    ])]

    if (allTags.length > 0) {
      await linkHashtags('PRODUCT', product.id, allTags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: allTags } },
        data: { postCount: { increment: 1 } },
      })
    } else {
      await removeHashtags('PRODUCT', product.id)
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('PUT /api/products/[id]:', error)
    console.error('Product update failed:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
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

    const existing = await prisma.product.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/products/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
