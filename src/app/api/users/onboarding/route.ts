import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createGettingStartedPlan } from '@/services/planService'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onboardingCompleted: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ onboardingCompleted: user.onboardingCompleted })
  } catch (error) {
    console.error('Error fetching onboarding status:', error)
    return NextResponse.json({ error: 'Failed to fetch onboarding status' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
  }
}
