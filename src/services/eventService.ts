import { prisma } from '@/lib/prisma'
import { extractHashtags, linkHashtags } from '@/services/hashtagService'

export async function findEvents(query: {
  type?: string
  projectId?: string
  organizerId?: string
  category?: string
  location?: string
  upcoming?: boolean
  page?: number
  limit?: number
}) {
  const { type = 'public', projectId, organizerId, category, upcoming, page = 1, limit = 20 } = query
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (organizerId) where.organizerId = organizerId
  if (category) where.eventCategory = category
  if (upcoming) where.eventDate = { gte: new Date() }
  if (type === 'personal') where.visibility = 'PRIVATE'

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        organizer: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, title: true } },
        _count: { select: { joiners: true } },
      },
      orderBy: { eventDate: 'asc' },
      skip,
      take: limit,
    }),
    prisma.event.count({ where }),
  ])

  return { events, total, page, pageSize: limit, totalPages: Math.ceil(total / limit) }
}

export async function getEventById(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, name: true, image: true, location: true } },
      project: { select: { id: true, title: true } },
      group: { select: { id: true, name: true } },
      joiners: { include: { user: { select: { id: true, name: true, image: true } } } },
      hashtags: { include: { hashtag: true } },
    },
  })
}

export async function createEvent(data: Record<string, unknown>, userId: string) {
  const hashtags = extractHashtags((data.description as string) || '')
  const event = await prisma.event.create({
    data: {
      title: data.title as string,
      description: data.description as string || '',
      eventDate: new Date(data.eventDate as string),
      endDate: data.endDate ? new Date(data.endDate as string) : null,
      location: data.location as string || null,
      eventCategory: data.eventCategory as string || 'GENERAL',
      maxJoiners: data.maxJoiners as number | null,
      isTicketed: data.isTicketed as boolean ?? false,
      ticketPrice: data.ticketPrice as number | null,
      organizerId: userId,
      projectId: data.projectId as string | null,
      groupId: data.groupId as string | null,
    },
  })

  if (hashtags.length > 0) {
    await linkHashtags('EVENT', event.id, hashtags)
  }

  return event
}

export async function updateEvent(id: string, data: Record<string, unknown>, userId: string) {
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.organizerId !== userId) throw new Error('Forbidden')

  return prisma.event.update({
    where: { id },
    data: {
      title: data.title as string | undefined,
      description: data.description as string | undefined,
      eventDate: data.eventDate ? new Date(data.eventDate as string) : undefined,
      location: data.location as string | null | undefined,
      eventCategory: data.eventCategory as string | undefined,
      maxJoiners: data.maxJoiners as number | null | undefined,
      isTicketed: data.isTicketed as boolean | undefined,
      ticketPrice: data.ticketPrice as number | null | undefined,
    },
  })
}

export async function deleteEvent(id: string, userId: string) {
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) throw new Error('Not found')
  if (existing.organizerId !== userId) throw new Error('Forbidden')

  await prisma.eventHashtag.deleteMany({ where: { eventId: id } })
  await prisma.event.delete({ where: { id } })
  return { deleted: true }
}

export async function joinEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new Error('Not found')

  const existing = await prisma.eventJoiner.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (existing) throw new Error('Already joined')

  if (event.maxJoiners) {
    const count = await prisma.eventJoiner.count({ where: { eventId } })
    if (count >= event.maxJoiners) throw new Error('Event is full')
  }

  return prisma.eventJoiner.create({ data: { eventId, userId } })
}

export async function leaveEvent(eventId: string, userId: string) {
  const existing = await prisma.eventJoiner.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (!existing) throw new Error('Not joined')

  await prisma.eventJoiner.delete({ where: { id: existing.id } })
  return { left: true }
}
