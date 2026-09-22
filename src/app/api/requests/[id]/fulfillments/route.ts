import { apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/services/notificationService'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const req = await prisma.request.findFirst({
      where: { id },
      select: {
        userId: true,
        projectId: true,
        allowFulfillments: true
      }
    })

    if (!req) {
      return apiError("Request not found", 404)
    }

    const fulfillments = await prisma.requestFulfillment.findMany({
      where: { requestId: id },
      include: {
        user: { select: { id: true, name: true, username: true, image: true, shopSlug: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ fulfillments, allowFulfillments: req.allowFulfillments })
  } catch (error) {
    console.error('GET /api/requests/[id]/fulfillments:', error)
    return apiError("Internal server error", 500)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params
    const body = await request.json()

    const req = await prisma.request.findFirst({
      where: { id },
      select: { userId: true, allowFulfillments: true, title: true, customFields: true }
    })

    if (!req) {
      return apiError("Request not found", 404)
    }

    if (!req.allowFulfillments) {
      return apiError("Fulfillments are disabled for this request", 400)
    }

    if (req.userId === session.user.id) {
      return apiError("Cannot fulfill your own request", 400)
    }

    if (!body.title?.trim() || !body.content?.trim()) {
      return apiError("Title and content are required", 400)
    }

    const fields = (Array.isArray(req.customFields) ? req.customFields : []) as Array<{ label: string; required?: boolean }>
    const submitted = (Array.isArray(body.answers) ? body.answers : []) as Array<{ label: unknown; value: unknown }>
    const errors: string[] = []
    for (const field of fields) {
      if (!field || typeof field !== 'object' || typeof field.label !== 'string') continue
      const value = submitted.find((a) => a && typeof a === 'object' && a.label === field.label)?.value
      if (field.required && (value == null || String(value).trim() === '')) {
        errors.push(field.label)
      }
    }
    if (errors.length > 0) {
      return apiError(`Please answer: ${errors.join(', ')}`, 400)
    }

    const answers = fields.length > 0
      ? fields
          .map((f) => {
            const value = submitted.find((a) => a && typeof a === 'object' && a.label === f.label)?.value
            return value == null || String(value).trim() === ''
              ? null
              : { label: f.label, value: String(value) }
          })
          .filter((a: unknown): a is { label: string; value: string } => a != null)
      : undefined

    const existing = await prisma.requestFulfillment.findFirst({
      where: { requestId: id, userId: session.user.id, status: 'PENDING' }
    })

    if (existing) {
      return apiError("You already have a pending offer for this request", 400)
    }

    const fulfillment = await prisma.requestFulfillment.create({
      data: {
        requestId: id,
        userId: session.user.id,
        title: body.title.trim(),
        content: body.content.trim(),
        answers: answers
      },
      include: {
        user: { select: { id: true, name: true, username: true, image: true, shopSlug: true } }
      }
    })

    // New fulfillments notify the request owner (pref-gated; never fails).
    try {
      await createNotification({
        type: 'REQUEST_UPDATE',
        userId: req.userId,
        actorId: session.user.id,
        entityId: fulfillment.id,
        entityType: 'REQUEST',
        title: 'New fulfillment offer',
        message: `${session.user.name || 'Someone'} offered to fulfill "${req.title.slice(0, 70)}"`,
        link: `/requests/${id}`,
      }).catch(() => null)
    } catch { /* silent */ }

    return apiSuccess(fulfillment)
  } catch (error) {
    console.error('POST /api/requests/[id]/fulfillments:', error)
    return apiError("Internal server error", 500)
  }
}
