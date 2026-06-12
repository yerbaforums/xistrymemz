import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serviceOfferingSchema, validateBody } from '@/lib/schemas'
import { geocodeLocation } from '@/lib/geocoding'
import { serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { extractHashtags, linkHashtags, removeHashtags } from '@/services/hashtagService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const service = await prisma.serviceOffering.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        hashtags: { include: { hashtag: { select: { id: true, tag: true } } } },
      },
    })

    if (!service) {
      return apiError("Service not found", 404)
    }

    const safe = {
      id: service.id,
      title: service.title,
      description: service.description ?? null,
      category: service.category,
      duration: service.duration,
      price: service.price ?? null,
      location: service.location ?? null,
      meetingLink: service.meetingLink ?? null,
      imageUrl: service.imageUrl ?? null,
      isActive: service.isActive,
      userId: service.userId,
      user: service.user,
      viewCount: service.viewCount,
      acceptsAppointments: service.acceptsAppointments === true,
      appointmentDuration: service.appointmentDuration ?? null,
      appointmentLeadTime: service.appointmentLeadTime ?? null,
      appointmentLocation: service.appointmentLocation ?? null,
      appointmentMeetingLink: service.appointmentMeetingLink ?? null,
      appointmentFormFields: Array.isArray(service.appointmentFormFields)
        ? (service.appointmentFormFields as any[]).filter(f => f && typeof f === 'object' && typeof f.label === 'string').map(f => ({ label: String(f.label), type: String(f.type || 'text'), required: Boolean(f.required) }))
        : null,
      hashtags: Array.isArray(service.hashtags)
        ? service.hashtags.filter(h => h?.hashtag?.tag).map(h => ({ id: h.id, hashtag: { id: h.hashtag.id, tag: h.hashtag.tag } }))
        : [],
      createdAt: service.createdAt instanceof Date ? service.createdAt.toISOString() : String(service.createdAt),
      updatedAt: service.updatedAt instanceof Date ? service.updatedAt.toISOString() : String(service.updatedAt),
    }

    return apiSuccess({ service: safe })
  } catch (error) {
    console.error('Error fetching service:', error)
    return apiError("Failed to fetch service", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const existing = await prisma.serviceOffering.findUnique({ where: { id } })
    if (!existing) {
      return apiError("Service not found", 404)
    }
    if (existing.userId !== session.user.id) {
      return apiError("Forbidden", 403)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return apiError("Invalid JSON body", 400)
    }
    const parsed = await validateBody(serviceOfferingSchema.partial(), body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const d = parsed.data
    if (d.title !== undefined) updateData.title = d.title.trim()
    if (d.description !== undefined) updateData.description = d.description?.trim() || null
    if (d.category !== undefined) updateData.category = d.category
    if (d.duration !== undefined) updateData.duration = d.duration
    if (d.price !== undefined) updateData.price = d.price || null
    if (d.location !== undefined) {
      updateData.location = d.location || null
      if (d.location && existing.location !== d.location) {
        try {
          const geo = await geocodeLocation(d.location)
          if (geo) { updateData.latitude = geo.latitude; updateData.longitude = geo.longitude }
        } catch {}
      }
      if (!d.location) { updateData.latitude = null; updateData.longitude = null }
    }
    if (d.meetingLink !== undefined) updateData.meetingLink = d.meetingLink || null
    if (d.imageUrl !== undefined) updateData.imageUrl = d.imageUrl || null
    if (d.isActive !== undefined) updateData.isActive = d.isActive
    if (d.acceptsDonations !== undefined) updateData.acceptsDonations = d.acceptsDonations
    if (d.acceptsDonations && d.selectedDonationAddrs) {
      const legacy = donationAddressesToLegacy(d.selectedDonationAddrs as any)
      updateData.donationAddress = legacy.donationAddress
      updateData.donationCurrency = legacy.donationCurrency
      updateData.donationAddresses = serializeDonationAddresses(d.selectedDonationAddrs as any) as any
    } else if (d.acceptsDonations === false) {
      updateData.donationAddress = null
      updateData.donationCurrency = null
      updateData.donationAddresses = null
    }
    if (d.acceptsAppointments !== undefined) updateData.acceptsAppointments = d.acceptsAppointments
    if (d.appointmentDuration !== undefined) updateData.appointmentDuration = d.appointmentDuration || null
    if (d.appointmentLeadTime !== undefined) updateData.appointmentLeadTime = d.appointmentLeadTime || null
    if (d.appointmentLocation !== undefined) updateData.appointmentLocation = d.appointmentLocation || null
    if (d.appointmentMeetingLink !== undefined) updateData.appointmentMeetingLink = d.appointmentMeetingLink || null
    if (d.appointmentFormFields !== undefined) updateData.appointmentFormFields = d.appointmentFormFields

    const service = await prisma.serviceOffering.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    // Re-process hashtags
    const title = d.title ?? existing.title
    const description = d.description ?? existing.description
    const newTags = [...new Set(extractHashtags([title, description || ''].join(' ')))]

    if (newTags.length > 0) {
      await linkHashtags('SERVICE', id, newTags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: newTags } },
        data: { postCount: { increment: 1 } },
      })
    } else {
      await removeHashtags('SERVICE', id)
    }

    return apiSuccess({ service })
  } catch (error) {
    console.error('Error updating service:', error)
    return apiError("Failed to update service", 500)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const existing = await prisma.serviceOffering.findUnique({ where: { id } })
    if (!existing) {
      return apiError("Service not found", 404)
    }
    if (existing.userId !== session.user.id) {
      return apiError("Forbidden", 403)
    }

    await prisma.serviceOffering.delete({ where: { id } })

    return apiSuccess({ message: 'Service deleted' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return apiError("Failed to delete service", 500)
  }
}
