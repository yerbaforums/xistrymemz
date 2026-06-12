import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id } = await params

  const saved = await prisma.savedItem.findUnique({
    where: { id },
    select: { userId: true }
  })

  if (!saved) {
    return apiError("Not found", 404)
  }

  if (saved.userId !== session.user.id) {
    return apiError("Forbidden", 403)
  }

  await prisma.savedItem.delete({ where: { id } })

  return apiSuccess({ success: true })
}
