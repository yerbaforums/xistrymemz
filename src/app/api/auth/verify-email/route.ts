import { NextRequest, apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { verifyEmailSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 20

const attemptCounts: Map<string, { count: number; firstAttempt: number }> = new Map()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const existing = attemptCounts.get(key)
  if (!existing) {
    attemptCounts.set(key, { count: 1, firstAttempt: now })
    return true
  }
  if (now - existing.firstAttempt > RATE_LIMIT_WINDOW) {
    attemptCounts.set(key, { count: 1, firstAttempt: now })
    return true
  }
  if (existing.count >= RATE_LIMIT_MAX) {
    return false
  }
  existing.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = verifyEmailSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { token } = validation.data

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`verify:${ip}`)) {
      return apiError("Too many requests. Please try again later.", 429)
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      if (verificationToken && verificationToken.expiresAt < new Date()) {
        await prisma.verificationToken.delete({ where: { id: verificationToken.id } })
      }
      return apiError("Invalid or expired token", 400)
    }

    // Use transaction to atomically verify user and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { verifiedEmail: true }
      }),
      prisma.verificationToken.delete({ where: { id: verificationToken.id } })
    ])

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('Email verification error:', error)
    return apiError("An error occurred", 500)
  }
}
