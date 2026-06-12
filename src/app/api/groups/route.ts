import { geocodeLocation } from '@/lib/geocoding'
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { groupSchema, validateBody } from '@/lib/schemas'
import { extractAndLinkHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const my = searchParams.get('my')
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    let where = {}

    if (my === 'true' && userId) {
      where = {
        members: { some: { userId } }
      }
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          isPrivate: true,
          category: true,
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { members: true, posts: true } },
          members: userId ? { where: { userId }, select: { id: true, role: true, userId: true } } : false
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.group.count({ where })
    ])

    return NextResponse.json({ items: groups, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('GET /api/groups:', error)
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
    const validation = validateBody(groupSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { name, description, privacy, category, location, latitude: formLat, longitude: formLng, isLocationBased, hashtags } = validation.data
    let latitude = formLat || null
    let longitude = formLng || null
    if (!latitude && !longitude && location) {
      try {
        const geo = await geocodeLocation(location)
        if (geo) { latitude = geo.latitude; longitude = geo.longitude }
      } catch {} 
    }

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description,
        category: category || 'GENERAL',
        isPrivate: privacy === 'PRIVATE',
        location: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
        isLocationBased: isLocationBased || false,
        userId: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'ADMIN'
          }
        }
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { members: true, posts: true } }
      }
    })

    if (Array.isArray(hashtags) && hashtags.length > 0) {
      await linkHashtags('GROUP', group.id, hashtags)
    } else {
      const text = [name, description || ''].join(' ')
      await extractAndLinkHashtags(text, 'GROUP', group.id)
    }

    return apiSuccess(group)
  } catch (error) {
    console.error('POST /api/groups:', error)
    return apiError("Internal server error", 500)
  }
}
