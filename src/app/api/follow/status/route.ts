import { apiSuccess, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET ?userId= → { following: boolean } for the current user.
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return apiUnauthorized()

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return apiSuccess({ following: false })

    const existing = await prisma.follow.findUnique({
      where: { followerId_followedId: { followerId: session.user.id, followedId: userId } },
      select: { followerId: true },
    })
    return apiSuccess({ following: !!existing })
  } catch (error) {
    return apiServerError(error)
  }
}
