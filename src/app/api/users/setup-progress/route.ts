import { apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const body = await request.json()
    const { completedSteps, setupDismissed } = body

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { setupProgress: true }
    })

    let progress: { completedSteps?: string[]; setupDismissed?: boolean }
    try {
      progress = existing?.setupProgress ? JSON.parse(existing.setupProgress) : {}
    } catch {
      progress = {}
    }

    if (completedSteps !== undefined) progress.completedSteps = completedSteps
    if (setupDismissed !== undefined) progress.setupDismissed = setupDismissed

    await prisma.user.update({
      where: { id: session.user.id },
      data: { setupProgress: JSON.stringify(progress) }
    })

    return NextResponse.json({ success: true, setupProgress: progress })
  } catch (error) {
    console.error('Error saving setup progress:', error)
    return apiError("Failed to save setup progress", 500)
  }
}
