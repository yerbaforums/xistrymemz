import { apiSuccess, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getConstellationData } from '@/lib/constellation'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(120, Math.max(1, parseInt(searchParams.get('limit') || '120')))
    const radius = parseInt(searchParams.get('radius') || '250')

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const user = userId
      ? await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            searchRadius: true,
          },
        })
      : null

    const data = await getConstellationData({
      userId,
      limit,
      radius: user?.searchRadius || radius,
    })

    return apiSuccess(data)
  } catch (error) {
    console.error('GET /api/constellation:', error)
    return apiServerError(error)
  }
}