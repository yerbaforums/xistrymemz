import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const groupId = searchParams.get('groupId')
    const schoolId = searchParams.get('schoolId')
    const shopId = searchParams.get('shopId')
    const planId = searchParams.get('planId')

    const where: Record<string, string> = {}

    if (groupId) where.groupId = groupId
    if (schoolId) where.schoolId = schoolId
    if (shopId) where.shopId = shopId
    if (planId) where.planId = planId

    const events = await prisma.event.findMany({
      where,
      include: {
        plan: { select: { id: true, title: true } },
        group: { select: { id: true, name: true, imageUrl: true } },
        school: { select: { id: true, schoolName: true, schoolImage: true } },
        shop: { select: { id: true, shopName: true, shopImage: true } },
        organizer: { select: { id: true, name: true } },
        _count: { select: { eventJoiners: true } }
      },
      orderBy: { eventDate: 'asc' }
    })

    return apiSuccess(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return apiError("Failed to fetch events", 500)
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return apiError("Unauthorized", 401)
    }

    let body;
    try {
      body = await req.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }

    const { title, description, eventCategory, eventDate, endDate, location, locationDetails, maxJoiners, isTicketed, ticketPrice, groupId, schoolId, shopId, planId } = body

    if (!title || !eventCategory) {
      return apiError("Title and category are required", 400)
    }

    const event = await prisma.event.create({
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
        planId: planId || null,
        organizerId: session.user.id
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } }
      }
    })

    return apiSuccess(event)
  } catch (error) {
    console.error('Error creating event:', error)
    return apiError("Failed to create event", 500)
  }
}