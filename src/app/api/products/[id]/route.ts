import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProductById, updateProduct, deleteProduct } from '@/services/productService'
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody, productSchema } from '@/lib/schemas'
import { geocodeLocation } from '@/lib/geocoding'
import { extractHashtags, linkHashtags, removeHashtags } from '@/services/hashtagService'

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
    const body: any = parsedBody

    const validation = validateBody(productSchema.partial(), body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, price, type, category, condition, location, locationDetails, imageUrl, isGlobal, published, paymentMethods, paymentType, acceptsRequests, acceptsOffers, requestPrice, acceptsDonations, donationAddress, donationCurrency, donationAddresses, sellerPayoutAddress, sellerCryptoCurrency, rentalDaily, rentalWeekly, rentalMonthly, rentalDeposit, rentalMinDays, rentalMaxDays, rentalAvailable, hashtags, acceptsAppointments, appointmentDuration, appointmentLeadTime, appointmentLocation, appointmentMeetingLink, appointmentFormFields } = body

    const existing = await prisma.product.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
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
        price: price != null ? parseFloat(price) : existing.price,
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
        requestPrice: requestPrice != null ? parseFloat(requestPrice) : existing.requestPrice,
        acceptsDonations: acceptsDonations ?? existing.acceptsDonations,
        donationAddress: donationAddress ?? existing.donationAddress,
        donationCurrency: donationCurrency ?? existing.donationCurrency,
        donationAddresses: donationAddresses !== undefined ? (donationAddresses || null) : existing.donationAddresses,
        sellerPayoutAddress: sellerPayoutAddress ?? existing.sellerPayoutAddress,
        sellerCryptoCurrency: sellerCryptoCurrency ?? existing.sellerCryptoCurrency,
        rentalDaily: rentalDaily != null ? parseFloat(rentalDaily) : existing.rentalDaily,
        rentalWeekly: rentalWeekly != null ? parseFloat(rentalWeekly) : existing.rentalWeekly,
        rentalMonthly: rentalMonthly != null ? parseFloat(rentalMonthly) : existing.rentalMonthly,
        rentalDeposit: rentalDeposit != null ? parseFloat(rentalDeposit) : existing.rentalDeposit,
        rentalMinDays: rentalMinDays != null ? parseInt(rentalMinDays) : existing.rentalMinDays,
        rentalMaxDays: rentalMaxDays != null ? parseInt(rentalMaxDays) : existing.rentalMaxDays,
        rentalAvailable: rentalAvailable ?? existing.rentalAvailable,
        acceptsAppointments: acceptsAppointments ?? existing.acceptsAppointments,
        appointmentDuration: appointmentDuration != null ? parseInt(appointmentDuration) : existing.appointmentDuration,
        appointmentLeadTime: appointmentLeadTime != null ? parseInt(appointmentLeadTime) : existing.appointmentLeadTime,
        appointmentLocation: appointmentLocation ?? existing.appointmentLocation,
        appointmentMeetingLink: appointmentMeetingLink ?? existing.appointmentMeetingLink,
        appointmentFormFields: appointmentFormFields ?? existing.appointmentFormFields
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
