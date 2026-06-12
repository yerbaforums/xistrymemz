import { NextRequest, apiSuccess, apiError, apiServerError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { forgotPasswordSchema } from '@/lib/validation'
import { sendPasswordResetEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 5

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
    const validation = forgotPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { email } = validation.data

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`forgot:${ip}`)) {
      return apiError("Too many requests. Please try again later.", 429)
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent' })
    }

    // Delete any existing reset tokens and create new one in a transaction
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { token, userId: user.id, expiresAt }
      })
    ])

    await sendPasswordResetEmail(user.email, token).catch(e => console.error('Failed to send reset email:', e))

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return apiError("An error occurred", 500)
  }
}
