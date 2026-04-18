import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const events = await prisma.planEvent.findMany({
    where: {
      plan: { published: true },
      OR: [
        { eventDate: { gte: new Date() } },
        { eventDate: null }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true,
      eventCategory: true,
      eventDate: true,
      location: true,
      locationDetails: true,
      latitude: true,
      longitude: true,
      maxJoiners: true,
      isTicketed: true,
      ticketPrice: true,
      currency: true,
      pinned: true,
      plan: {
        select: {
          id: true,
          title: true,
          userId: true,
          user: { select: { name: true } }
        }
      },
      joiners: { 
        include: { user: { select: { name: true, email: true } } }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { eventDate: 'asc' }
    ]
  })

  const result = await Promise.all(events.map(async event => {
    let latitude = event.latitude
    let longitude = event.longitude
    
    if ((!latitude || !longitude) && event.locationDetails) {
      const geocoded = await geocodeLocation(event.locationDetails)
      if (geocoded) {
        latitude = geocoded.latitude
        longitude = geocoded.longitude
      }
    }
    
    const isJoined = userId ? event.joiners.some(j => j.userId === userId) : false
    
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
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      pinned: event.pinned,
      planId: event.plan.id,
      planTitle: event.plan.title,
      userName: event.plan.user.name,
      userId: event.plan.userId,
      joiners: event.joiners.map(j => ({
        id: j.id,
        userId: j.userId,
        user: { name: j.user.name, email: j.user.email }
      })),
      joined: isJoined
    }
  }))

  return NextResponse.json(result)
}
