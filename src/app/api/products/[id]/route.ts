import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  return NextResponse.json(product)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.product.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!existing) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const { title, description, price, type, category, condition, location, locationDetails, imageUrl, isGlobal, published, paymentMethods, paymentType, acceptsRequests, requestPrice } = body

  let latitude = existing.latitude
  let longitude = existing.longitude

  if (location && location !== existing.location && !isGlobal) {
    const geocodeResult = await geocodeLocation(location)
    if (geocodeResult) {
      latitude = geocodeResult.latitude
      longitude = geocodeResult.longitude
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      title: title ?? existing.title,
      description: description ?? existing.description,
      price: price ? parseFloat(price) : existing.price,
      type: type ?? existing.type,
      category: category ?? existing.category,
      condition: condition ?? existing.condition,
      location: isGlobal ? 'GLOBAL' : (location ?? existing.location),
      locationDetails: locationDetails ?? existing.locationDetails,
      latitude,
      longitude,
      isGlobal: isGlobal ?? existing.isGlobal,
      imageUrl: imageUrl ?? existing.imageUrl,
      published: published ?? existing.published,
      paymentMethods: paymentMethods ? paymentMethods.join(',') : existing.paymentMethods,
      paymentType: paymentType ?? existing.paymentType,
      acceptsRequests: acceptsRequests ?? existing.acceptsRequests,
      requestPrice: requestPrice ? parseFloat(requestPrice) : existing.requestPrice
    }
  })

  return NextResponse.json(product)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
}
