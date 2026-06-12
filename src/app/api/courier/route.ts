import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const active = searchParams.get('active')

    const where: Record<string, unknown> = {}
    
    if (userId) {
      where.userId = userId
    }
    if (active !== null) {
      where.isActive = active === 'true'
    }

    const services = await prisma.courierService.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, image: true, location: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess(services)
  } catch (error) {
    console.error('Error fetching courier services:', error)
    return apiError("Failed to fetch services", 500)
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
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

    if (!name || basePrice === undefined) {
      return apiError("Name and base price required", 400)
    }

    const service = await prisma.courierService.create({
      data: {
        name,
        description: description || null,
        serviceType: serviceType || 'DELIVERY',
        basePrice,
        pricePerMile: pricePerMile || 0,
        maxDistance: maxDistance || 100,
        availableAreas: availableAreas || null,
        isActive: isActive ?? true,
        userId: session.user.id
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    })

    return apiSuccess(service)
  } catch (error) {
    console.error('Error creating courier service:', error)
    return apiError("Failed to create service", 500)
  }
}
