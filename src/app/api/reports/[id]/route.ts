import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiSuccess, apiError, apiUnauthorized, apiServerError, apiNotFound } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { validateBody } from '@/lib/schemas'

const statusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED']),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()
    if (session.user.role !== 'ADMIN') return apiError('Admin access required', 403)

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = validateBody(statusSchema, body)
    if (!parsed.success) return apiError(parsed.error)

    const report = await prisma.report.findUnique({ where: { id } })
    if (!report) return apiNotFound('Report not found')

    const updated = await prisma.report.update({
      where: { id },
      data: { status: parsed.data.status },
    })
    return apiSuccess(updated)
  } catch (error) {
    return apiServerError(error)
  }
}