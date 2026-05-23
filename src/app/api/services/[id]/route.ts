import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serviceOfferingSchema, validateBody } from '@/lib/schemas'
import { serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { extractHashtags } from '@/lib/hashtags'

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
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error fetching service:', error)
    return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.serviceOffering.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
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
    if (d.location !== undefined) updateData.location = d.location || null
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
    const existingTags = await prisma.serviceOfferingHashtag.findMany({
      where: { serviceOfferingId: id },
      include: { hashtag: true },
    })
    const oldTagNames = existingTags.map(e => e.hashtag.tag)

    // Remove old tags that no longer match
    for (const et of existingTags) {
      if (!newTags.includes(et.hashtag.tag)) {
        await prisma.serviceOfferingHashtag.delete({ where: { id: et.id } })
        await prisma.hashtag.update({
          where: { id: et.hashtagId },
          data: { postCount: { decrement: 1 } },
        })
      }
    }

    // Add new tags
    for (const tag of newTags) {
      if (!oldTagNames.includes(tag)) {
        const hashtag = await prisma.hashtag.upsert({
          where: { tag },
          create: { tag, postCount: 0 },
          update: {},
        })
        await prisma.serviceOfferingHashtag.create({
          data: { serviceOfferingId: id, hashtagId: hashtag.id, sourceType: 'SERVICE' },
        }).catch(() => {})
        await prisma.hashtag.update({
          where: { id: hashtag.id },
          data: { postCount: { increment: 1 } },
        })
      }
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Error updating service:', error)
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.serviceOffering.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }
    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.serviceOffering.delete({ where: { id } })

    return NextResponse.json({ message: 'Service deleted' })
  } catch (error) {
    console.error('Error deleting service:', error)
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
  }
}
