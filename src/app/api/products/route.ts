import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
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

    const where: { published: boolean; category?: string; type?: string; location?: string; user?: { shopSlug: string }; userId?: string; OR?: Record<string, unknown>[] } = { published: true }

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

    const products = await prisma.product.findMany({
      where,
      include: {
        user: { select: { name: true, location: true, neighborhood: true } }
      },
      orderBy: [
        { pinned: 'desc' },
        { createdAt: 'desc' }
      ]
    })

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

    return NextResponse.json(filteredProducts)
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

    const body = await request.json()
    const validation = validateBody(productSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { name, description, price, category, imageUrl } = validation.data

    let latitude: number | null = null
    let longitude: number | null = null

    const product = await prisma.product.create({
      data: {
        title: name,
        description,
        price,
        type: 'PRODUCT',
        category,
        location: 'GLOBAL',
        isGlobal: true,
        imageUrl,
        userId: session.user.id
      }
    })

    return NextResponse.json(product)
  } catch (error) {
    console.error('POST /api/products:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
