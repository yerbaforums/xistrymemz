import { apiSuccess, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { eventDate: { gte: new Date() } },
        { eventDate: null }
      ]
    },
    include: {
      organizer: { select: { id: true, name: true } },
      project: { 
        select: { 
          id: true, 
          title: true, 
          userId: true,
          published: true,
          user: { select: { name: true } }
        }
      },
      group: { select: { id: true, name: true } },
      _count: { select: { eventJoiners: true } },
      eventJoiners: {
        include: { user: { select: { name: true, email: true } } }
      },
      eventHashtags: {
        include: { hashtag: true }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { eventDate: 'asc' }
    ]
  })

  const result = await Promise.all(events.map(async event => {
    if (event.project if (event.project && !event.project.published)if (event.project && !event.project.published) !event.project.published) return null

    let latitude = event.latitude
    let longitude = event.longitude
    
    if ((!latitude || !longitude) && event.locationDetails) {
      const geocoded = await geocodeLocation(event.locationDetails)
      if (geocoded) {
        latitude = geocoded.latitude
        longitude = geocoded.longitude
      }
    }
    
    const isJoined = userId ? event.eventJoiners.some(j => j.userId === userId) : false
    
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      eventCategory: event.eventCategory,
      eventDate: event.eventDate,
      location: event.location,
      locationDetails: event.locationDetails,
      latitude,
      longitude,
      maxJoiners: event.maxJoiners,
      pinned: event.pinned,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      projectId: event.projectId,
      projectTitle: event.project?.title || null,
      userName: event.project?.user?.name || event.organizer?.name || null,
      userId: event.project?.userId || event.organizerId,
      joiners: event.eventJoiners.map(j => ({
        id: j.id,
        userId: j.userId,
        user: { name: j.user.name, email: j.user.email }
      })),
      joined: isJoined,
      acceptsDonations: event.acceptsDonations,
      donationAddress: event.donationAddress,
      donationCurrency: event.donationCurrency,
      hashtags: event.eventHashtags.map(eh => eh.hashtag.tag)
    }
  }))

  return apiSuccess(result.filter(Boolean))
}