import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params
  const body = await request.json()
  const { name, icon, color } = body

  const existing = await prisma.locationCategory.findFirst({
    where: { id, userId: session.user.id }
  })
  if (!existing) {
    return apiError("Not found", 404)
  }

  const category = await prisma.locationCategory.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color })
    }
  })

  return apiSuccess(category)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  const existing = await prisma.locationCategory.findFirst({
    where: { id, userId: session.user.id }
  })
  if (!existing) {
    return apiError("Not found", 404)
  }

  await prisma.locationCategory.delete({ where: { id } })
  return apiSuccess({ success: true })
}
