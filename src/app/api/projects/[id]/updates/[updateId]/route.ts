import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { id: projectId, updateId } = await params
  const body = await request.json()

  const update = await prisma.projectUpdate.findFirst({ where: { id: updateId, projectId, userId: session.user.id } })
  if (!update) return apiError("Not found", 404)

  const data: Record<string, unknown> = {}
  if (body.content !== undefined) data.content = body.content.trim()
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl
  if (body.images !== undefined) data.images = body.images

  const updated = await prisma.projectUpdate.update({ where: { id: updateId }, data })
  return apiSuccess(updated)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { id: projectId, updateId } = await params
  const update = await prisma.projectUpdate.findFirst({ where: { id: updateId, projectId, userId: session.user.id } })
  if (!update) return apiError("Not found", 404)

  await prisma.projectUpdate.delete({ where: { id: updateId } })
  return apiSuccess({ success: true })
}
