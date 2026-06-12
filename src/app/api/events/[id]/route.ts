import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { eventSchema, validateBody } from '@/lib/schemas'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: {
          select: { id: true, name: true, image: true, role: true, username: true }
        },
        plan: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        school: { select: { id: true, schoolName: true, name: true } },
        shop: { select: { id: true, shopName: true, name: true } },
        _count: {
          select: { eventJoiners: true }
        },
        eventJoiners: {
          select: {
            id: true,
            userId: true,
            role: true,
            user: {
              select: { name: true, image: true, role: true, userClass: true, username: true }
            }
          },
          take: 50
        },
        eventHashtags: {
          include: { hashtag: true }
        }
      }
    })

    if (!event) {
      return apiError("Event not found", 404)
    }

    const isOrganizer = session?.user?.id === event.organizerId
    const joined = session?.user?.id 
      ? event.eventJoiners.some(j => j.userId === session.user.id)
      : false

    const linkedTitle = event.plan?.title || event.group?.name || event.school?.schoolName || event.shop?.shopName || null

    return NextResponse.json({
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
      acceptsDonations: event.acceptsDonations,
      donationAddress: event.donationAddress,
      donationCurrency: event.donationCurrency,
      donationAddresses: event.donationAddresses,
      needsVolunteers: event.needsVolunteers,
      volunteerRoles: event.volunteerRoles ? (() => { try { const p = JSON.parse(event.volunteerRoles); return Array.isArray(p) ? p : [] } catch { return [] } })() : [],
      volunteerDescription: event.volunteerDescription,
      planId: event.planId,
      planTitle: linkedTitle,
      userId: event.organizerId,
      userName: event.organizer.name,
      organizer: event.organizer,
      group: event.group,
      joiners: event.eventJoiners.map(j => ({
        id: j.id,
        userId: j.userId,
        role: j.role,
        user: j.user
      })),
      joined,
      isOrganizer,
      hashtags: event.eventHashtags.map(eh => eh.hashtag.tag),
      _count: event._count
    })
  } catch (error) {
    console.error('GET /api/events/[id]:', error)
    return apiError("Failed to fetch event", 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return apiError("Event not found", 404)
    }

    if (event.organizerId !== session.user.id) {
      return apiError("Forbidden", 403)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON", 400)
    }

    const validation = validateBody(eventSchema.partial(), body)
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
      acceptsDonations,
      donationAddress,
      donationCurrency,
      donationAddresses,
      needsVolunteers,
      volunteerRoles,
      volunteerDescription,
      schoolId,
      shopId,
      hashtags
    } = validation.data

    let latitude = event.latitude
    let longitude = event.longitude

    if (location && location !== event.location) {
      const geocodeResult = await geocodeLocation(location)
      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl: imageUrl !== undefined ? imageUrl : event.imageUrl,
        eventCategory: eventCategory || event.eventCategory,
        eventDate: eventDate ? new Date(eventDate) : event.eventDate,
        endDate: endDate ? new Date(endDate) : event.endDate,
        location,
        locationDetails,
        latitude,
        longitude,
        maxJoiners: maxJoiners ?? event.maxJoiners,
        isTicketed: isTicketed ?? event.isTicketed,
        ticketPrice: ticketPrice ?? event.ticketPrice,
        currency: currency ?? event.currency,
        acceptsDonations: acceptsDonations ?? event.acceptsDonations,
        donationAddress: donationAddress ?? event.donationAddress,
        donationCurrency: donationCurrency ?? event.donationCurrency,
        donationAddresses: donationAddresses !== undefined ? (donationAddresses || null) : event.donationAddresses,
        needsVolunteers: needsVolunteers ?? event.needsVolunteers,
        volunteerRoles: volunteerRoles ?? event.volunteerRoles,
        volunteerDescription: volunteerDescription ?? event.volunteerDescription,
        schoolId: schoolId !== undefined ? schoolId : event.schoolId,
        shopId: shopId !== undefined ? shopId : event.shopId
      }
    })

    if (hashtags !== undefined) {
      const allTags = [...new Set([
        ...hashtags,
        ...extractHashtags([title || event.title, description || event.description || ''].join(' '))
      ])]

      await linkHashtags('EVENT', id, allTags)
      if (allTags.length > 0) {
        await prisma.hashtag.updateMany({
          where: { tag: { in: allTags } },
          data: { postCount: { increment: 1 } },
        })
      }
    }

    return apiSuccess(updated)
  } catch (error) {
    console.error('PUT /api/events/[id]:', error)
    return apiError("Failed to update event", 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) {
      return apiError("Event not found", 404)
    }

    if (event.organizerId !== session.user.id) {
      return apiError("Forbidden", 403)
    }

    await prisma.event.delete({ where: { id } })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('DELETE /api/events/[id]:', error)
    return apiError("Failed to delete event", 500)
  }
}