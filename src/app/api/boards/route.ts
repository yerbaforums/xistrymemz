import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findNearbyBoards } from '@/lib/boardService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined
    const radius = searchParams.get('radius') ? parseInt(searchParams.get('radius')!) : undefined
    const city = searchParams.get('city') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const north = searchParams.get('north') ? parseFloat(searchParams.get('north')!) : undefined
    const south = searchParams.get('south') ? parseFloat(searchParams.get('south')!) : undefined
    const east = searchParams.get('east') ? parseFloat(searchParams.get('east')!) : undefined
    const west = searchParams.get('west') ? parseFloat(searchParams.get('west')!) : undefined

    const session = await getServerSession(authOptions)
    let userLat = lat
    let userLng = lng

    let effectiveRadius = radius
    if (userLat === undefined && session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { latitude: true, longitude: true, searchRadius: true },
      })
      if (user?.latitude && user?.longitude) {
        userLat = user.latitude
        userLng = user.longitude
        if (effectiveRadius === undefined) {
          effectiveRadius = user.searchRadius || 50
        }
      }
    }

    const result = await findNearbyBoards({
      lat: userLat,
      lng: userLng,
      radius: effectiveRadius || 50,
      city,
      page,
      north,
      south,
      east,
      west,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, location, latitude, longitude, city, region, country, description } = body

    if (!name || !location) {
      return NextResponse.json({ error: 'Name and location are required' }, { status: 400 })
    }

    let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    let counter = 1
    while (await prisma.bulletinBoard.findUnique({ where: { slug } })) {
      slug = `${slug}-${counter}`
      counter++
    }

    const board = await prisma.bulletinBoard.create({
      data: {
        name,
        slug,
        description: description || null,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        city: city || null,
        region: region || null,
        country: country || null,
        isSystem: false,
        ownerId: session.user.id,
      },
    })

    return NextResponse.json(board)
  } catch (error) {
    console.error('POST /api/boards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
