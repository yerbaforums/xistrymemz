import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGettingStartedPlan } from '@/services/planService'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true }
    })

    if (!user) {
      return apiError("User not found", 404)
    }

    return apiSuccess({ onboardingCompleted: user.onboardingCompleted })
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    return apiError("Failed to fetch onboarding status", 500)
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json().catch(() => ({}))
    const { createPlan, interestTags } = body

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true }
    })

    if (interestTags && Array.isArray(interestTags) && interestTags.length > 0) {
      const hashtags = await prisma.hashtag.findMany({
        where: { tag: { in: interestTags.map(t => t.toLowerCase()) } },
      })
      const existing = await prisma.userHashtagFollow.findMany({
        where: { userId: session.user.id, hashtagId: { in: hashtags.map(h => h.id) } },
      })
      const existingIds = new Set(existing.map(e => e.hashtagId))
      const toCreate = hashtags.filter(h => !existingIds.has(h.id))
      if (toCreate.length > 0) {
        await prisma.userHashtagFollow.createMany({
          data: toCreate.map(h => ({ userId: session.user.id, hashtagId: h.id })),
        })
      }
    }

    if (createPlan) {
      await createGettingStartedPlan(session.user.id)
    }

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return apiError("Failed to update onboarding status", 500)
  }
}
