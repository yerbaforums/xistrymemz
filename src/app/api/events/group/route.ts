import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // group, school, shop
    const groupId = searchParams.get('groupId')
    const schoolId = searchParams.get('schoolId')
    const shopId = searchParams.get('shopId')

    const where: Record<string, string> = {}

    if (type === 'group' && groupId) {
      where.groupId = groupId
    } else if (type === 'school' && schoolId) {
      where.schoolId = schoolId
    } else if (type === 'shop' && shopId) {
      where.shopId = shopId
    }

    const events = await prisma.groupEvent.findMany({
      where,
      include: {
        group: { select: { id: true, name: true, imageUrl: true } },
        school: { select: { id: true, schoolName: true, schoolImage: true } },
        shop: { select: { id: true, shopName: true, shopImage: true } },
        organizer: { select: { id: true, name: true, email: true } },
        _count: { select: { eventJoiners: true } }
      },
      orderBy: { eventDate: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching group events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, eventCategory, eventDate, endDate, location, locationDetails, maxJoiners, isTicketed, ticketPrice, groupId, schoolId, shopId } = body

    if (!title || !eventCategory) {
      return NextResponse.json({ error: 'Title and category are required' }, { status: 400 })
    }

    if (!groupId && !schoolId && !shopId) {
      return NextResponse.json({ error: 'Must specify group, school, or shop' }, { status: 400 })
    }

    const event = await prisma.groupEvent.create({
      data: {
        title,
        description,
        eventCategory,
        eventDate: eventDate ? new Date(eventDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        location,
        locationDetails,
        maxJoiners: maxJoiners || 0,
        isTicketed: isTicketed || false,
        ticketPrice: ticketPrice || 0,
        groupId: groupId || null,
        schoolId: schoolId || null,
        shopId: shopId || null,
        organizerId: session.user.id
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating group event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}