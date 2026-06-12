import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 401)
  }

  try {
    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return apiError("User not found", 404)
    }

    if (user.id === session.user.id) {
      return apiError("Cannot delete your own account", 400)
    }

    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return apiError("Failed to delete user", 500)
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 401)
  }

  try {
    const { id } = await context.params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        coverImage: true,
        bio: true,
        location: true,
        neighborhood: true,
        latitude: true,
        longitude: true,
        website: true,
        userClass: true,
        role: true,
        shopName: true,
        shopSlug: true,
        schoolName: true,
        schoolSlug: true,
        walletAddress: true,
        paymentAddress: true,
        refundAddress: true,
        cryptoCurrency: true,
        balance: true,
        earthId: true,
        verificationLevel: true,
        reputationScore: true,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedIdentity: true,
        verifiedAddress: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            plans: true,
            posts: true,
            products: true,
            requests: true,
            sentConnections: true,
            receivedConnections: true,
            escrowAsSeller: true,
            escrowAsBuyer: true
          }
        }
      }
    })

    if (!user) {
      return apiError("User not found", 404)
    }

    return apiSuccess({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return apiError("Failed to fetch user", 500)
  }
}