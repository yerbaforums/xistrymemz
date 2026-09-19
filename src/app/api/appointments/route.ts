import { NextRequest, apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

interface AppointmentBookingBody {
  title?: string
  description?: string
  startTime?: string
  endTime?: string
  duration?: number | null
  location?: string | null
  meetingLink?: string | null
  sellerId?: string
  productId?: string | null
  formResponses?: Array<{ label?: unknown; value?: unknown }>
  category?: string | null
  serviceOfferingId?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'buyer' | 'seller'
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (role === 'buyer') where.buyerId = session.user.id
    else if (role === 'seller') where.sellerId = session.user.id
    else where.OR = [{ buyerId: session.user.id }, { sellerId: session.user.id }]

    if (status) where.status = status

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        buyer: { select: { id: true, name: true, image: true, username: true } },
        seller: { select: { id: true, name: true, image: true, username: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      },
      orderBy: { startTime: 'asc' }
    })

    return apiSuccess({ appointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return apiError("Failed to fetch appointments", 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const { title, description, startTime, endTime, duration, location, meetingLink, sellerId, productId, formResponses, category, serviceOfferingId } = body as AppointmentBookingBody

    if (!title || !startTime || !endTime || !sellerId) {
      return apiError("Missing required fields", 400)
    }

    if (sellerId === session.user.id) {
      return apiError("Cannot book appointment with yourself", 400)
    }

    const start = new Date(startTime)
    const end = new Date(endTime)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiError("Invalid start or end time", 400)
    }
    if (end <= start) {
      return apiError("End time must be after start time", 400)
    }

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { userId: true, acceptsAppointments: true, title: true },
      })
      if (!product) {
        return apiError("Product not found", 404)
      }
      if (product.userId !== sellerId) {
        return apiError("Product does not belong to this seller", 400)
      }
      if (!product.acceptsAppointments) {
        return apiError(`"${product.title}" does not accept bookings`, 400)
      }
    }

    if (serviceOfferingId) {
      const service = await prisma.serviceOffering.findUnique({
        where: { id: serviceOfferingId },
        select: { userId: true, acceptsAppointments: true, title: true },
      })
      if (!service) {
        return apiError("Service not found", 404)
      }
      if (service.userId !== sellerId) {
        return apiError("Service does not belong to this seller", 400)
      }
      if (!service.acceptsAppointments) {
        return apiError(`"${service.title}" does not accept bookings`, 400)
      }
    }

    const normalizedResponses = Array.isArray(formResponses)
      ? formResponses
          .filter((r) => r && typeof r === 'object' && typeof r.label === 'string')
          .map((r) => ({ label: String(r.label), value: String(r.value ?? '') }))
      : undefined

    const appointment = await prisma.appointment.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        startTime: start,
        endTime: end,
        duration: duration || null,
        location: location || null,
        meetingLink: meetingLink || null,
        buyerId: session.user.id,
        sellerId,
        productId: productId || null,
        category: category || null,
        serviceOfferingId: serviceOfferingId || null,
        formResponses: normalizedResponses || undefined
      },
      include: {
        buyer: { select: { id: true, name: true, image: true, username: true } },
        seller: { select: { id: true, name: true, image: true, username: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      }
    })

    const buyerName = (appointment.buyer?.name || session.user.name || 'Someone')

    // Pref-gated: Settings → Notifications → Appointments. Never fail the booking.
    try {
      await createNotification({
        type: 'APPOINTMENT_REQUEST',
        userId: sellerId,
        actorId: session.user.id,
        entityId: appointment.id,
        entityType: 'APPOINTMENT',
        title: 'New Booking Request',
        message: `${buyerName} wants to book "${title}" with you`,
        link: `/dashboard/appointments`,
      })
    } catch {
      // silent — appointment was already created
    }

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return apiError("Failed to create appointment", 500)
  }
}
