import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return apiError("Current password and new password are required", 400)
    }

    if (newPassword.length < 6) {
      return apiError("New password must be at least 6 characters", 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })

    if (!user) {
      return apiError("User not found", 404)
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return apiError("Current password is incorrect", 400)
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    })

    return apiSuccess({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return apiError("Failed to change password", 500)
  }
}
