import { NextResponse } from 'next/server'
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
      plan: { 
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
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { eventDate: 'asc' }
    ]
  })

  const result = await Promise.all(events.map(async event => {
    if (event.plan && !event.plan.published) return null

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
      planId: event.planId,
      planTitle: event.plan?.title || null,
      userName: event.plan?.user?.name || event.organizer?.name || null,
      userId: event.plan?.userId || event.organizerId,
      joiners: event.eventJoiners.map(j => ({
        id: j.id,
        userId: j.userId,
        user: { name: j.user.name, email: j.user.email }
      })),
      joined: isJoined
    }
  }))

  return NextResponse.json(result.filter(Boolean))
}