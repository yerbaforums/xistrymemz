import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { eventSchema, validateBody } from '@/lib/schemas'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'public'
    const projectId = searchParams.get('projectId')
    const organizerId = searchParams.get('organizerId')

    if (type === 'personal') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return apiError("Unauthorized", 401)
      }

      const events = await prisma.userEvent.findMany({
        where: { userId: session.user.id },
        orderBy: { startDate: 'asc' }
      })
      return apiSuccess(events)
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const where: Record<string, unknown> = {}
    
    if (projectId) {
      where.projectId = projectId
    }

    if (organizerId) {
      where.organizerId = organizerId
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          organizer: { select: { id: true, name: true } },
          project: { select: { id: true, title: true, userId: true } },
          group: { select: { id: true, name: true } },
          school: { select: { id: true, schoolName: true, name: true } },
          shop: { select: { id: true, shopName: true, name: true } },
          _count: { select: { eventJoiners: true } },
          eventJoiners: {
            select: { userId: true },
            take: 20
          }
        },
        skip,
        take: pageSize,
        orderBy: { eventDate: 'asc' }
      }),
      prisma.event.count({ where })
    ])

    const formattedEvents = events.map(event => {
      const linkedTitle = event.project?.title || event.group?.name || event.school?.schoolName || event.shop?.shopName || null
      
      return {
        id: event.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        eventCategory: event.eventCategory,
        eventDate: event.eventDate?.toISOString() || null,
        endDate: event.endDate?.toISOString() || null,
        location: event.location,
        locationDetails: event.locationDetails,
        latitude: event.latitude,
        longitude: event.longitude,
        maxJoiners: event.maxJoiners,
        pinned: event.pinned,
        isTicketed: event.isTicketed,
        ticketPrice: event.ticketPrice,
        currency: event.currency,
        projectId: event.projectId,
        projectTitle: linkedTitle,
        userId: event.organizerId,
        userName: event.organizer?.name || null,
        joiners: event.eventJoiners.map(j => j.userId),
        joined: userId ? event.eventJoiners.some(j => j.userId === userId) : false,
        _count: event._count
      }
    })

    return apiSuccess({ items: formattedEvents, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (error) {
    console.error('GET /api/events:', error)
    return apiError("Failed to fetch events", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const validation = validateBody(eventSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { 
      title, 
      description, 
      imageUrl,
      eventCategory, 
      eventDate, 
      endDate,
      location, 
      locationDetails, 
      maxJoiners,
      isTicketed,
      ticketPrice,
      currency,
      visibility,
      eventType,
      projectId,
      groupId,
      schoolId,
      shopId,
      acceptsDonations,
      donationAddress,
      donationCurrency,
      donationAddresses,
      needsVolunteers,
      volunteerRoles,
      volunteerDescription,
      createGroup,
      hashtags
    } = validation.data

    if (eventType === 'personal') {
      const event = await prisma.userEvent.create({
        data: {
          title,
          description,
          startDate: eventDate ? new Date(eventDate) : new Date(),
          endDate: endDate ? new Date(endDate) : undefined,
          location,
          visibility: visibility || 'PRIVATE',
          userId: session.user.id
        }
      })
      return apiSuccess(event)
    }

    let latitude: number | null = body.latitude ?? null
    let longitude: number | null = body.longitude ?? null

    if (!latitude && !longitude && location) {
      const geocodeResult = await geocodeLocation(location)
      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
      }
    }

    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId }
      })
      if (!project) {
        return apiError("Project not found", 404)
      }
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        imageUrl: imageUrl || null,
        eventCategory: eventCategory || 'GENERAL',
        eventDate: eventDate ? new Date(eventDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        location,
        locationDetails,
        latitude,
        longitude,
        maxJoiners: maxJoiners || 0,
        isTicketed: isTicketed || false,
        ticketPrice: ticketPrice || 0,
        currency: currency || 'USD',
        acceptsDonations: acceptsDonations || false,
        donationAddress: donationAddress || null,
        donationCurrency: donationCurrency || 'ETH',
        donationAddresses: donationAddresses || null,
        needsVolunteers: needsVolunteers || false,
        volunteerRoles: volunteerRoles || null,
        volunteerDescription: volunteerDescription || null,
        projectId: projectId || null,
        groupId: groupId || null,
        schoolId: schoolId || undefined,
        shopId: shopId || undefined,
        organizerId: session.user.id
      }
    })

    if (createGroup) {
      const groupName = `${title} Discussion`
      const group = await prisma.group.create({
        data: {
          name: groupName,
          description: `Community discussion group for the event: ${title}. ${description || ''}`,
          isLocationBased: !!location,
          location,
          latitude,
          longitude,
          userId: session.user.id,
          members: {
            create: {
              userId: session.user.id,
              role: 'ADMIN'
            }
          }
        }
      })
      await prisma.event.update({
        where: { id: event.id },
        data: { groupId: group.id }
      })
      return NextResponse.json({ ...event, groupId: group.id, _group: group })
    }

    const allTags = [...new Set([
      ...(hashtags || []),
      ...extractHashtags([title, description || ''].join(' '))
    ])]

    if (allTags.length > 0) {
      await linkHashtags('EVENT', event.id, allTags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: allTags } },
        data: { postCount: { increment: 1 } },
      })
    }

    return apiSuccess(event)
  } catch (error) {
    console.error('POST /api/events:', error)
    return apiError("Failed to create event", 500)
  }
}