import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { title, description, startTime, endTime, duration, location, meetingLink, sellerId, productId, formResponses, category, serviceOfferingId } = body as any

    if (!title || !startTime || !endTime || !sellerId) {
      return apiError("Missing required fields", 400)
    }

    if (sellerId === session.user.id) {
      return apiError("Cannot book appointment with yourself", 400)
    }

    const appointment = await prisma.appointment.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        duration: duration || null,
        location: location || null,
        meetingLink: meetingLink || null,
        buyerId: session.user.id,
        sellerId,
        productId: productId || null,
        category: category || null,
        serviceOfferingId: serviceOfferingId || null,
        formResponses: formResponses || undefined
      },
      include: {
        buyer: { select: { id: true, name: true, image: true, username: true } },
        seller: { select: { id: true, name: true, image: true, username: true } },
        product: { select: { id: true, title: true, imageUrl: true } }
      }
    })

    const buyerName = (appointment.buyer?.name || session.user.name || 'Someone')

    await prisma.notification.create({
      data: {
        type: 'APPOINTMENT_REQUEST',
        title: 'New Booking Request',
        message: `${buyerName} wants to book "${title}" with you`,
        link: `/dashboard/appointments`,
        userId: sellerId,
        relatedId: appointment.id
      }
    }).catch(() => {})

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return apiError("Failed to create appointment", 500)
  }
}
