import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    })

    await sendPasswordResetEmail(user.email, token)

    return NextResponse.json({ success: true, message: 'Password reset email sent' })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
