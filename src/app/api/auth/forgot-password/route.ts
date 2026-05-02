import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { forgotPasswordSchema } from '@/lib/validation'

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
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
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

    // TODO: Send email with reset link via Resend/SendGrid
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${token}`
    console.log('Password reset link:', resetUrl)

    return NextResponse.json({ success: true, message: 'If an account exists, a reset link has been sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}
