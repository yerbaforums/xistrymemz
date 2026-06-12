import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const service = await prisma.courierService.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true, location: true } }
      }
    })

    if (!service) {
      return apiError("Service not found", 404)
    }

    return apiSuccess(service)
  } catch (error) {
    console.error('Error fetching courier service:', error)
    return apiError("Failed to fetch service", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const service = await prisma.courierService.findUnique({
      where: { id }
    })

    if (!service) {
      return apiError("Service not found", 404)
    }

    if (service.userId !== session.user.id) {
      return apiError("Access denied", 403)
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      serviceType, 
      basePrice, 
      pricePerMile, 
      maxDistance,
      availableAreas,
      isActive 
    } = body

    const updated = await prisma.courierService.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(serviceType && { serviceType }),
        ...(basePrice !== undefined && { basePrice }),
        ...(pricePerMile !== undefined && { pricePerMile }),
        ...(maxDistance !== undefined && { maxDistance }),
        ...(availableAreas !== undefined && { availableAreas }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating courier service:', error)
    return apiError("Failed to update service", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const service = await prisma.courierService.findUnique({
      where: { id }
    })

    if (!service) {
      return apiError("Service not found", 404)
    }

    if (service.userId !== session.user.id) {
      return apiError("Access denied", 403)
    }

    await prisma.courierService.delete({ where: { id } })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error deleting courier service:', error)
    return apiError("Failed to delete service", 500)
  }
}
