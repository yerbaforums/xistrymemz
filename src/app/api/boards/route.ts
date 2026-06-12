import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
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
    const q = searchParams.get('q') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(100, searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20)
    const north = searchParams.get('north') ? parseFloat(searchParams.get('north')!) : undefined
    const south = searchParams.get('south') ? parseFloat(searchParams.get('south')!) : undefined
    const east = searchParams.get('east') ? parseFloat(searchParams.get('east')!) : undefined
    const west = searchParams.get('west') ? parseFloat(searchParams.get('west')!) : undefined

    const my = searchParams.get('my') === 'true'

    const session = await getServerSession(authOptions)

    if (my && session?.user?.id) {
      const skip = (page - 1) * limit
      const [boards, total] = await Promise.all([
        prisma.bulletinBoard.findMany({
          where: { ownerId: session.user.id },
          include: { _count: { select: { pins: true, members: true } } },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.bulletinBoard.count({ where: { ownerId: session.user.id } }),
      ])
      return NextResponse.json({
        boards: boards.map(b => ({ ...b, pinCount: b._count.pins, memberCount: b._count.members })),
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      })
    }

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
      q,
      page,
      limit,
      north,
      south,
      east,
      west,
    })

    return apiSuccess(result)
  } catch (error) {
    console.error('GET /api/boards:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const { name, location, latitude, longitude, city, region, country, description } = body as any

    if (!name || !location) {
      return apiError("Name and location are required", 400)
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

    return apiSuccess(board)
  } catch (error) {
    console.error('POST /api/boards:', error)
    return apiError("Internal server error", 500)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const { id, name, description, location, latitude, longitude, city, region, country } = body as any

    if (!id) {
      return apiError("Board ID is required", 400)
    }

    const existing = await prisma.bulletinBoard.findUnique({ where: { id } })
    if (!existing) {
      return apiError("Board not found", 404)
    }
    if (existing.ownerId !== session.user.id) {
      return apiError("Not authorized to edit this board", 403)
    }

    const board = await prisma.bulletinBoard.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description !== undefined ? description : existing.description,
        location: location || existing.location,
        latitude: latitude !== undefined ? latitude : existing.latitude,
        longitude: longitude !== undefined ? longitude : existing.longitude,
        city: city !== undefined ? city : existing.city,
        region: region !== undefined ? region : existing.region,
        country: country !== undefined ? country : existing.country,
      },
    })

    return apiSuccess(board)
  } catch (error) {
    console.error('PUT /api/boards:', error)
    return apiError("Internal server error", 500)
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return apiError("Board ID is required", 400)
    }

    const existing = await prisma.bulletinBoard.findUnique({ where: { id } })
    if (!existing) {
      return apiError("Board not found", 404)
    }
    if (existing.ownerId !== session.user.id) {
      return apiError("Not authorized to delete this board", 403)
    }

    await prisma.bulletinPin.deleteMany({ where: { boardId: id } })
    await prisma.bulletinBoard.delete({ where: { id } })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/boards:', error)
    return apiError("Internal server error", 500)
  }
}
