import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveAt: new Date() }
    })

    return apiSuccess({ ok: true })
  } catch {
    return apiError("Failed", 500)
  }
}
