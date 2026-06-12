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

  const { id: planId } = await params
  const { email } = await request.json()

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { userId: true }
  })

  if (!plan) {
    return apiError("Plan not found", 404)
  }

  if (plan.userId !== session.user.id) {
    return apiError("Only the plan owner can add editors", 403)
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return apiError("User not found", 404)
  }

  const editor = await prisma.planEditor.create({
    data: {
      planId,
      userId: user.id
    }
  })

  return apiSuccess(editor)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: planId } = await params
  const { searchParams } = new URL(request.url)
  const editorId = searchParams.get('editorId')

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { userId: true }
  })

  if (!plan) {
    return apiError("Plan not found", 404)
  }

  if (plan.userId !== session.user.id) {
    return apiError("Only the plan owner can remove editors", 403)
  }

  await prisma.planEditor.delete({
    where: { id: editorId! }
  })

  return apiSuccess({ success: true })
}
