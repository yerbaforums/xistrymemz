import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { eventSchema, validateBody } from '@/lib/schemas'
import { extractHashtags } from '@/lib/hashtags'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'public'
    const planId = searchParams.get('planId')
    const organizerId = searchParams.get('organizerId')

    if (type === 'personal') {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const events = await prisma.userEvent.findMany({
        where: { userId: session.user.id },
        orderBy: { startDate: 'asc' }
      })
      return NextResponse.json(events)
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const where: Record<string, unknown> = {}
    
    if (planId) {
      where.planId = planId
    }

    if (organizerId) {
      where.organizerId = organizerId
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true } },
        plan: { select: { id: true, title: true, userId: true } },
        group: { select: { id: true, name: true } },
        school: { select: { id: true, schoolName: true, name: true } },
        shop: { select: { id: true, shopName: true, name: true } },
        _count: { select: { eventJoiners: true } },
        eventJoiners: {
          select: { userId: true },
          take: 20
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    const formattedEvents = events.map(event => {
      const linkedTitle = event.plan?.title || event.group?.name || event.school?.schoolName || event.shop?.shopName || null
      
      return {
        id: event.id,
        title: event.title,
        description: event.description,
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
        planId: event.planId,
        planTitle: linkedTitle,
        userId: event.organizerId,
        userName: event.organizer?.name || null,
        joiners: event.eventJoiners.map(j => j.userId),
        joined: userId ? event.eventJoiners.some(j => j.userId === userId) : false,
        _count: event._count
      }
    })

    return NextResponse.json(formattedEvents)
  } catch (error) {
    console.error('GET /api/events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body;
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateBody(eventSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { 
      title, 
      description, 
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
      planId,
      groupId,
      acceptsDonations,
      donationAddress,
      donationCurrency,
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
      return NextResponse.json(event)
    }

    let latitude: number | null = null
    let longitude: number | null = null

    if (location) {
      const geocodeResult = await geocodeLocation(location)
      if (geocodeResult) {
        latitude = geocodeResult.latitude
        longitude = geocodeResult.longitude
      }
    }

    if (planId) {
      const plan = await prisma.plan.findFirst({
        where: { id: planId }
      })
      if (!plan) {
        return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
      }
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
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
        needsVolunteers: needsVolunteers || false,
        volunteerRoles: volunteerRoles ? JSON.stringify(volunteerRoles) : null,
        volunteerDescription: volunteerDescription || null,
        planId: planId || null,
        groupId: groupId || null,
        shopId: eventCategory === 'SHOP' ? session.user.id : undefined,
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
      await Promise.all(allTags.map(async tag => {
        const hashtag = await prisma.hashtag.upsert({
          where: { tag },
          create: { tag, postCount: 0 },
          update: {},
        })
        await prisma.eventHashtag.create({
          data: {
            eventId: event.id,
            hashtagId: hashtag.id,
          },
        }).catch(() => {})
        await prisma.hashtag.update({
          where: { id: hashtag.id },
          data: { postCount: { increment: 1 } },
        })
      }))
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('POST /api/events:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}