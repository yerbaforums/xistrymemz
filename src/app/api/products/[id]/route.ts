import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { productSchema, validateBody } from '@/lib/schemas'

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
    const body = await request.json()

    const validation = validateBody(productSchema.partial(), body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { title, description, price, type, category, condition, location, locationDetails, imageUrl, isGlobal, published, paymentMethods, paymentType, acceptsRequests, acceptsOffers, requestPrice, sellerPayoutAddress, sellerCryptoCurrency } = body

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
        sellerPayoutAddress: sellerPayoutAddress ?? existing.sellerPayoutAddress,
        sellerCryptoCurrency: sellerCryptoCurrency ?? existing.sellerCryptoCurrency
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('PUT /api/products/[id]:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Update failed: ${errorMessage}` }, { status: 500 })
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
