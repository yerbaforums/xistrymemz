import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const locations = await prisma.userLocation.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { isPrimary: 'desc' },
      { createdAt: 'asc' }
    ],
    include: { category: true }
  })

  return apiSuccess(locations)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const body = await request.json()
  const { name, location, latitude, longitude, categoryId, tags, notes, imageUrl } = body

  if (!name) {
    return apiError("Name is required", 400)
  }

  // Check if this is the user's first location
  const existingLocations = await prisma.userLocation.count({
    where: { userId: session.user.id }
  })

  // If first location, make it primary
  const isPrimary = existingLocations === 0

  const userLocation = await prisma.userLocation.create({
    data: {
      name,
      location,
      latitude: latitude || null,
      longitude: longitude || null,
      isPrimary,
      categoryId: categoryId || null,
      tags: tags || null,
      notes: notes || null,
      imageUrl: imageUrl || null,
      userId: session.user.id
    }
  })

  // Update user's primaryLocationId if this is primary
  if (isPrimary) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        primaryLocationId: userLocation.id,
        location: location,
        latitude: latitude || null,
        longitude: longitude || null
      }
    })
  }

  return apiSuccess(userLocation)
}
