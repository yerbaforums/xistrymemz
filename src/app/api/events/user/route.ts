import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const userId = session.user.id

  const [organizedEvents, joinedEvents, userEvents] = await Promise.all([
    prisma.event.findMany({
      where: { organizerId: userId },
      select: {
        id: true,
        title: true,
        description: true,
        eventDate: true,
        endDate: true,
        eventCategory: true,
        location: true,
        locationDetails: true,
        latitude: true,
        longitude: true,
        maxJoiners: true,
        isTicketed: true,
        ticketPrice: true,
        currency: true,
        acceptsDonations: true,
        donationAddress: true,
        donationCurrency: true,
        needsVolunteers: true,
        volunteerRoles: true,
        volunteerDescription: true,
        schoolId: true,
        shopId: true,
        createdAt: true,
        project: { select: { id: true, title: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { eventJoiners: true } },
        eventHashtags: { include: { hashtag: true } }
      }
    }),
    prisma.eventJoiner.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            eventDate: true,
            endDate: true,
            eventCategory: true,
            location: true,
            locationDetails: true,
            latitude: true,
            longitude: true,
            maxJoiners: true,
            isTicketed: true,
            ticketPrice: true,
            currency: true,
            acceptsDonations: true,
            donationAddress: true,
            donationCurrency: true,
            needsVolunteers: true,
            volunteerRoles: true,
            volunteerDescription: true,
            schoolId: true,
            shopId: true,
            createdAt: true,
            project: { select: { id: true, title: true } },
            group: { select: { id: true, name: true } },
            _count: { select: { eventJoiners: true } },
            eventHashtags: { include: { hashtag: true } }
          }
        }
      }
    }),
    prisma.userEvent.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        location: true,
        color: true,
        visibility: true,
        createdAt: true
      }
    })
  ])

  const events = [
    ...organizedEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventDate: e.eventDate?.toISOString() || null,
      endDate: e.endDate?.toISOString() || null,
      eventCategory: e.eventCategory,
      location: e.location,
      locationDetails: e.locationDetails,
      latitude: e.latitude,
      longitude: e.longitude,
      maxJoiners: e.maxJoiners,
      isTicketed: e.isTicketed,
      ticketPrice: e.ticketPrice,
      currency: e.currency,
      acceptsDonations: e.acceptsDonations,
      donationAddress: e.donationAddress,
      donationCurrency: e.donationCurrency,
      needsVolunteers: e.needsVolunteers || false,
      volunteerRoles: e.volunteerRoles || null,
      volunteerDescription: e.volunteerDescription || null,
      schoolId: e.schoolId || null,
      shopId: e.shopId || null,
      joinerCount: e._count.eventJoiners,
      type: 'ORGANIZED',
      projectTitle: e.project?.title || null,
      projectId: e.project?.id || null,
      groupTitle: e.group?.name || null,
      groupId: e.group?.id || null,
      createdAt: e.createdAt.toISOString(),
      hashtags: e.eventHashtags.map(eh => eh.hashtag.tag)
    })),
    ...joinedEvents.map(j => ({
      id: j.event.id,
      title: j.event.title,
      description: j.event.description,
      eventDate: j.event.eventDate?.toISOString() || null,
      endDate: j.event.endDate?.toISOString() || null,
      eventCategory: j.event.eventCategory,
      location: j.event.location,
      locationDetails: j.event.locationDetails,
      latitude: j.event.latitude,
      longitude: j.event.longitude,
      maxJoiners: j.event.maxJoiners,
      isTicketed: j.event.isTicketed,
      ticketPrice: j.event.ticketPrice,
      currency: j.event.currency,
      acceptsDonations: j.event.acceptsDonations,
      donationAddress: j.event.donationAddress,
      donationCurrency: j.event.donationCurrency,
      needsVolunteers: j.event.needsVolunteers || false,
      volunteerRoles: j.event.volunteerRoles || null,
      volunteerDescription: j.event.volunteerDescription || null,
      schoolId: j.event.schoolId || null,
      shopId: j.event.shopId || null,
      joinerCount: j.event._count.eventJoiners,
      type: 'JOINED',
      projectTitle: j.event.project?.title || null,
      projectId: j.event.project?.id || null,
      groupTitle: j.event.group?.name || null,
      groupId: j.event.group?.id || null,
      createdAt: j.event.createdAt.toISOString(),
      hashtags: j.event.eventHashtags.map(eh => eh.hashtag.tag)
    })),
    ...userEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      eventDate: e.startDate?.toISOString() || null,
      eventCategory: 'PERSONAL',
      location: e.location,
      locationDetails: null,
      latitude: null,
      longitude: null,
      maxJoiners: 0,
      isTicketed: false,
      ticketPrice: 0,
      currency: 'USD',
      acceptsDonations: false,
      donationAddress: null,
      donationCurrency: 'ETH',
      joinerCount: 0,
      type: 'PERSONAL',
      projectTitle: null,
      projectId: null,
      groupTitle: null,
      groupId: null,
      createdAt: e.createdAt.toISOString()
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return apiSuccess(events)
}