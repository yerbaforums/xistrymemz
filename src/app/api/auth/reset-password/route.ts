import { NextRequest, apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { resetPasswordSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10

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
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 })
    }
    const { token, password } = validation.data

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`reset:${ip}`)) {
      return apiError("Too many requests. Please try again later.", 429)
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken || resetToken.expiresAt < new Date()) {
      if (resetToken && resetToken.expiresAt < new Date()) {
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
      }
      return apiError("Invalid or expired token", 400)
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Use transaction to atomically update password and delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordResetToken.delete({ where: { id: resetToken.id } })
    ])

    return NextResponse.json({ success: true, message: 'Password reset successful' })
  } catch (error) {
    console.error('Reset password error:', error)
    return apiError("An error occurred", 500)
  }
}
