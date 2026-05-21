import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingCompleted: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking onboarding complete:', error)
    return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 })
  }
}
