import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const existingLocation = await prisma.userLocation.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!existingLocation) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
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

  return NextResponse.json({ success: true })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify ownership
  const existingLocation = await prisma.userLocation.findFirst({
    where: { id, userId: session.user.id }
  })

  if (!existingLocation) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const body = await request.json()
  const { name, location, latitude, longitude, categoryId, tags, notes, imageUrl } = body

  // Update this location
  const updated = await prisma.userLocation.update({
    where: { id },
    data: {
      name: name || existingLocation.name,
      location: location || existingLocation.location,
      latitude: latitude !== undefined ? latitude : existingLocation.latitude,
      longitude: longitude !== undefined ? longitude : existingLocation.longitude,
      categoryId: categoryId !== undefined ? categoryId : existingLocation.categoryId,
      tags: tags !== undefined ? tags : existingLocation.tags,
      notes: notes !== undefined ? notes : existingLocation.notes,
      imageUrl: imageUrl !== undefined ? imageUrl : existingLocation.imageUrl
    }
  })

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

  return NextResponse.json(updated)
}