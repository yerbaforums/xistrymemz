import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const amount = parseFloat(body.amount)

    if (!amount || amount <= 0) {
      return apiError("Valid amount required", 400)
    }

    const project = await prisma.project.findUnique({ where: { id } })

    if (!plan) {
      return apiError("Project not found", 404)
    }

    if (!plan.acceptsDonations) {
      return apiError("This plan does not accept donations", 400)
    }

    const [contribution] = await prisma.$transaction([
      prisma.projectContribution.create({
        data: {
          amount,
          message: body.message || null,
          projectId: id,
          userId: session.user.id
        }
      }),
      prisma.project.update({
        where: { id },
        data: {
          currentFunding: (plan.currentFunding || 0) + amount
        }
      })
    ])

    return apiSuccess(contribution)
  } catch (error) {
    console.error('POST /api/projects/[id]/contribute:', error)
    return apiError("Internal server error", 500)
  }
}
