import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { id } = await params

    const slot = await prisma.availability.findUnique({ where: { id } })
    if (!slot) {
      return apiError("Slot not found", 404)
    }
    if (slot.userId !== session.user.id) {
      return apiError("Forbidden", 403)
    }

    await prisma.availability.delete({ where: { id } })
    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error deleting availability:', error)
    return apiError("Failed to delete availability", 500)
  }
}
