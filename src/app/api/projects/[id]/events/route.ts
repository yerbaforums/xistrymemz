import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { geocodeLocation } from '@/lib/geocoding'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const events = await prisma.event.findMany({
    where: { projectId: id },
    include: {
      eventJoiners: {
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    },
    orderBy: { eventDate: 'asc' }
  })

  return apiSuccess(events)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  let body;
  try {
    body = await request.json()
  } catch {
    return apiError("Invalid JSON body", 400)
  }

  const { title, description, eventCategory, eventDate, endDate, location, locationDetails, maxJoiners, isTicketed, ticketPrice, currency } = body

  const project = await prisma.project.findFirst({
    where: { id }
  })

  if (!project) {
    return apiError("Project not found", 404)
  }

  const isOwner = project.userId === session.user.id
  const isEditor = await prisma.projectEditor.findFirst({
    where: { projectId: id, userId: session.user.id }
  })
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isEditor && !isAdmin) {
    return apiError("Permission denied", 403)
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

  const event = await prisma.event.create({
    data: {
      title,
      description,
      eventCategory,
      eventDate: eventDate ? new Date(eventDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      location,
      locationDetails,
      latitude,
      longitude,
      maxJoiners: maxJoiners || 0,
      isTicketed: isTicketed || false,
      ticketPrice: ticketPrice || 0,
      currency: currency || 'USD',
      projectId: id,
      organizerId: session.user.id
    }
  })

  return apiSuccess(event)
}