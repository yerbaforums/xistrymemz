import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  // Verify ownership
  const existingLocation = await prisma.userLocation.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!existingLocation) {
    return apiError("Location not found", 404)
  }

  await prisma.userLocation.delete({ where: { id } })

  // If deleted location was primary, set another as primary
  if (existingLocation.isPrimary) {
    const nextPrimary = await prisma.userLocation.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' }
    })

    if (nextPrimary) {
      await prisma.userLocation.update({
        where: { id: nextPrimary.id },
        data: { isPrimary: true }
      })

      await prisma.user.update({
        where: { id: session.user.id },
        data: { 
          primaryLocationId: nextPrimary.id,
          location: nextPrimary.location,
          latitude: nextPrimary.latitude,
          longitude: nextPrimary.longitude
        }
      })
    } else {
      // No locations left, clear user's primaryLocationId
      await prisma.user.update({
        where: { id: session.user.id },
        data: { primaryLocationId: null }
      })
    }
  }

  return apiSuccess({ success: true })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  // Verify ownership
  const existingLocation = await prisma.userLocation.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!existingLocation) {
    return apiError("Location not found", 404)
  }

  const body = await request.json()
  const { name, location, latitude, longitude, categoryId, tags, notes, imageUrl, lastVisitedAt, isPrimary } = body

  const updateData: any = {
    name: name || existingLocation.name,
    location: location || existingLocation.location,
    latitude: latitude !== undefined ? latitude : existingLocation.latitude,
    longitude: longitude !== undefined ? longitude : existingLocation.longitude,
    categoryId: categoryId !== undefined ? categoryId : existingLocation.categoryId,
    tags: tags !== undefined ? tags : existingLocation.tags,
    notes: notes !== undefined ? notes : existingLocation.notes,
    imageUrl: imageUrl !== undefined ? imageUrl : existingLocation.imageUrl,
    lastVisitedAt: lastVisitedAt !== undefined ? new Date(lastVisitedAt) : existingLocation.lastVisitedAt
  }

  if (isPrimary === false) {
    // Unset primary: clear isPrimary on this location and user's primaryLocationId
    updateData.isPrimary = false
    const updated = await prisma.userLocation.update({ where: { id }, data: updateData })
    if (existingLocation.isPrimary) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { primaryLocationId: null }
      })
    }
    return apiSuccess(updated)
  }

  const updated = await prisma.userLocation.update({ where: { id }, data: updateData })

  // Set as primary
  await prisma.userLocation.updateMany({
    where: { userId: session.user.id },
    data: { isPrimary: false }
  })

  await prisma.userLocation.update({
    where: { id },
    data: { isPrimary: true }
  })

  // Update user's primaryLocationId
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      primaryLocationId: id,
      location: updated.location,
      latitude: updated.latitude,
      longitude: updated.longitude
    }
  })

  return apiSuccess(updated)
}