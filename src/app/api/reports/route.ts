import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody } from '@/lib/schemas'

const reportSchema = z.object({
  entityType: z.enum([
    'FORUMPOST', 'FORUMREPLY', 'POST', 'PRODUCT', 'SERVICE', 'EVENT', 'PLAN', 'REQUEST', 'GROUP', 'USER'
  ]),
  entityId: z.string().min(1),
  reason: z.enum(['SPAM', 'ABUSE', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER']),
  description: z.string().max(1000).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const body = await request.json().catch(() => ({}))
    const parsed = validateBody(reportSchema, body)
    if (!parsed.success) return apiError(parsed.error)

    const { entityType, entityId, reason, description } = parsed.data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const recent = await prisma.report.findFirst({
      where: { reporterId: session.user.id, entityType, entityId, createdAt: { gt: sevenDaysAgo } }
    })
    if (recent) {
      return apiError('You already reported this content recently', 429)
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        entityType,
        entityId,
        reason,
        description: description || null,
      },
    })
    return apiSuccess(report, 201)
  } catch (error) {
    console.error('Error creating report:', error)
    return apiServerError(error)
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()
    if (session.user.role !== 'ADMIN') return apiError('Admin access required', 403)

    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { reporter: { select: { id: true, name: true, username: true, image: true } } },
    })
    return apiSuccess(reports)
  } catch (error) {
    return apiServerError(error)
  }
}