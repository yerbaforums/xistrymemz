import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const invitations = await prisma.eventInvitation.findMany({
      where: { eventId: id },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
        inviter: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess({ invitations })
  } catch (error) {
    console.error('GET invites error:', error)
    return apiError("Failed to load invitations", 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    const event = await prisma.event.findUnique({ where: { id } })
    if (!event) return apiError("Event not found", 404)
    if (event.organizerId !== session.user.id) {
      return apiError("Only the organizer can send invites", 403)
    }

    let body: any
    try { body = await request.json() } catch { return apiError("Invalid JSON body", 400) }
    const { userIds, message } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiError("User IDs required", 400)
    }

    const invitations = await Promise.all(
      userIds.map(async (userId: string) => {
        const existing = await prisma.eventInvitation.findUnique({
          where: { eventId_userId: { eventId: id, userId } }
        })
        if (existing) return existing
        return prisma.eventInvitation.create({
          data: { eventId: id, userId, invitedBy: session.user.id, message: message || null },
          include: {
            user: { select: { id: true, name: true, image: true, username: true } },
          },
        })
      })
    )

    return NextResponse.json({ invitations }, { status: 201 })
  } catch (error) {
    console.error('POST invite error:', error)
    return apiError("Failed to send invitations", 500)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  try {
    let body: any
    try { body = await request.json() } catch { return apiError("Invalid JSON body", 400) }
    const { status: newStatus } = body

    if (!['ACCEPTED', 'DECLINED'].includes(newStatus)) {
      return apiError("Invalid status", 400)
    }

    const invitation = await prisma.eventInvitation.findUnique({
      where: { eventId_userId: { eventId: id, userId: session.user.id } }
    })
    if (!invitation) return apiError("Invitation not found", 404)

    await prisma.eventInvitation.update({
      where: { id: invitation.id },
      data: { status: newStatus },
    })

    if (newStatus === 'ACCEPTED') {
      await prisma.eventJoiner.upsert({
        where: { eventId_userId: { eventId: id, userId: session.user.id } },
        update: { role: 'ATTENDEE' },
        create: { eventId: id, userId: session.user.id, role: 'ATTENDEE' },
      })
    }

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('PUT invite error:', error)
    return apiError("Failed to respond", 500)
  }
}
