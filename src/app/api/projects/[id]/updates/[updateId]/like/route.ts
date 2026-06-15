import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; updateId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return apiError("Unauthorized", 401)

  const { updateId } = await params

  const existing = await prisma.projectUpdateLike.findUnique({
    where: { projectUpdateId_userId: { projectUpdateId: updateId, userId: session.user.id } }
  })

  if (existing) {
    await prisma.projectUpdateLike.delete({ where: { id: existing.id } })
    await prisma.projectUpdate.update({ where: { id: updateId }, data: { likes: { decrement: 1 } } })
    return apiSuccess({ liked: false })
  }

  await prisma.projectUpdateLike.create({ data: { projectUpdateId: updateId, userId: session.user.id } })
  await prisma.projectUpdate.update({ where: { id: updateId }, data: { likes: { increment: 1 } } })
  return apiSuccess({ liked: true })
}
