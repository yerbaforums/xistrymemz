import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const role = body.role || 'ATTENDEE'

  if (!['ATTENDEE', 'VOLUNTEER'].includes(role)) {
    return apiError("Invalid role", 400)
  }

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: { joiners: true }
  })

  if (!plan) {
    return apiError("Plan not found", 404)
  }

  if (plan.userId === session.user.id) {
    return apiError("Cannot join your own plan", 400)
  }

  const existingJoiner = await prisma.planJoiner.findUnique({
    where: {
      planId_userId: {
        planId: plan.id,
        userId: session.user.id
      }
    }
  })

  if (existingJoiner && existingJoiner.role === role) {
    return apiSuccess({ error: `Already joined as ${role.toLowerCase()}` }, { status: 400 })
  }

  if (existingJoiner) {
    const joiner = await prisma.planJoiner.update({
      where: { id: existingJoiner.id },
      data: { role }
    })
    return apiSuccess(joiner)
  }

  const joiner = await prisma.planJoiner.create({
    data: {
      planId: plan.id,
      userId: session.user.id,
      role
    }
  })

  return apiSuccess(joiner)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const url = new URL(request.url)
  const role = url.searchParams.get('role') || 'ATTENDEE'

  const joiner = await prisma.planJoiner.findUnique({
    where: {
      planId_userId: {
        planId: id,
        userId: session.user.id
      }
    }
  })

  if (!joiner) {
    return apiError("Not joined this plan", 404)
  }

  if (joiner.role !== role) {
    return apiSuccess({ error: `Not joined as ${role.toLowerCase()}` }, { status: 400 })
  }

  await prisma.planJoiner.delete({
    where: { id: joiner.id }
  })

  return apiSuccess({ success: true })
}
