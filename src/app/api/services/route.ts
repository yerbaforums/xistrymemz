import { NextRequest, apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serviceOfferingSchema, validateBody } from '@/lib/schemas'
import { serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'
import { geocodeLocation } from '@/lib/geocoding'
import { hasVerifiedEmail } from '@/lib/verified-email'
import {
  getEffectiveListingLocation,
  sanitizeEffectiveLocationForPublic,
  isPassportHidden,
} from '@/lib/listing-location'
import type { DonationAddr } from '@/types/product'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const search = searchParams.get('q')
    const userId = searchParams.get('userId')
    const sort = searchParams.get('sort') || 'newest'
    const session = await getServerSession(authOptions)

    const where: Record<string, unknown> = { isActive: true }

    if (userId) {
      where.userId = userId
    }

    if (category && category !== 'ALL') {
      where.category = category
    }
    if (location && location !== 'ALL') {
      where.location = location
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))
    const skip = (page - 1) * pageSize

    const [rawServices, total] = await Promise.all([
      prisma.serviceOffering.findMany({
        where,
        include: {
          user: {
            select: {
              id: true, name: true, image: true, username: true,
              location: true, traveling: true, latitude: true, longitude: true, preferences: true,
            },
          },
          hashtags: { include: { hashtag: { select: { tag: true } } } }
        },
        skip,
        take: pageSize,
        orderBy: sort === 'price-low'
          ? { price: 'asc' }
          : sort === 'price-high'
          ? { price: 'desc' }
          : sort === 'duration'
          ? { duration: 'asc' }
          : { createdAt: 'desc' },
      }),
      prisma.serviceOffering.count({ where })
    ])

    const services = rawServices.map(s => {
      // Effective location: services opted into "travels with me" sit at the
      // owner's current passport location while they're traveling. The
      // traveling-derived city is hidden from non-owners when the owner's
      // passport is hidden, and raw owner preferences never leave the server.
      const effective = getEffectiveListingLocation(s, s.user)
      const isOwnerView = session?.user?.id === s.userId
      const shown = isOwnerView
        ? effective
        : sanitizeEffectiveLocationForPublic(effective, isPassportHidden(s.user?.preferences))
      const { preferences: _ownerPrefs, ...ownerPublic } = s.user

      return {
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        category: s.category,
        duration: s.duration,
        price: s.price ?? null,
        location: s.location ?? null,
        latitude: s.latitude ?? null,
        longitude: s.longitude ?? null,
        travelsWithOwner: s.travelsWithOwner === true,
        effectiveLocation: shown.location,
        effectiveLatitude: shown.latitude,
        effectiveLongitude: shown.longitude,
        ownerTraveling: effective.traveling,
        meetingLink: s.meetingLink ?? null,
        imageUrl: s.imageUrl ?? null,
        isActive: s.isActive === true,
        userId: s.userId,
        user: ownerPublic,
        viewCount: s.viewCount,
        acceptsAppointments: s.acceptsAppointments === true,
        appointmentDuration: s.appointmentDuration ?? null,
        appointmentLeadTime: s.appointmentLeadTime ?? null,
        appointmentLocation: s.appointmentLocation ?? null,
        appointmentMeetingLink: s.appointmentMeetingLink ?? null,
        appointmentFormFields: Array.isArray(s.appointmentFormFields) ? s.appointmentFormFields : null,
        hashtags: s.hashtags ?? [],
        createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
        updatedAt: s.updatedAt instanceof Date ? s.updatedAt.toISOString() : String(s.updatedAt),
      }
    })

    return apiSuccess({ services, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })


  } catch (error) {
    console.error('Error fetching services:', error)
    return apiError("Failed to fetch services", 500)
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
    const parsed = await validateBody(serviceOfferingSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    let latitude: number | null = null
    let longitude: number | null = null
    if (parsed.data.location && !parsed.data.meetingLink) {
      try {
        const geo = await geocodeLocation(parsed.data.location)
        if (geo) { latitude = geo.latitude; longitude = geo.longitude }
      } catch {}
    }

    const verifiedPublish = await hasVerifiedEmail(session.user.id)
    const wantsPublish = parsed.data.isActive ?? true
    const needsEmailVerification = wantsPublish && !verifiedPublish

    const selectedAddrList: DonationAddr[] = (parsed.data.acceptsDonations ? parsed.data.selectedDonationAddrs || [] : []).map(a => ({
      id: a.id,
      currency: a.currency,
      address: a.address,
      label: a.label ?? null,
      qrCodeUrl: a.qrCodeUrl ?? null,
      showQR: a.showQR ?? true,
      sortOrder: a.sortOrder ?? 0,
    }))

    const service = await prisma.serviceOffering.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        category: parsed.data.category,
        duration: parsed.data.duration,
        price: parsed.data.price || null,
        location: parsed.data.location || null,
        latitude,
        longitude,
        // Online services (meeting-link only) have nowhere to travel with you.
        travelsWithOwner: parsed.data.meetingLink
          ? false
          : parsed.data.travelsWithOwner ?? false,
        meetingLink: parsed.data.meetingLink || null,
        imageUrl: parsed.data.imageUrl || null,
        isActive: wantsPublish && verifiedPublish,
        acceptsDonations: parsed.data.acceptsDonations ?? false,
        ...donationAddressesToLegacy(selectedAddrList),
        donationAddresses: serializeDonationAddresses(selectedAddrList),
        acceptsAppointments: parsed.data.acceptsAppointments ?? false,
        appointmentDuration: parsed.data.appointmentDuration || null,
        appointmentLeadTime: parsed.data.appointmentLeadTime || null,
        appointmentLocation: parsed.data.appointmentLocation || null,
        appointmentMeetingLink: parsed.data.appointmentMeetingLink || null,
        appointmentFormFields: parsed.data.appointmentFormFields || undefined,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    // Extract hashtags from title + description
    const allTags = [...new Set(extractHashtags([parsed.data.title, parsed.data.description || ''].join(' ')))]
    if (allTags.length > 0) {
      await linkHashtags('SERVICE', service.id, allTags)
      await prisma.hashtag.updateMany({
        where: { tag: { in: allTags } },
        data: { postCount: { increment: 1 } },
      })
    }

    return NextResponse.json({ service, needsEmailVerification }, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return apiError("Failed to create service", 500)
  }
}
