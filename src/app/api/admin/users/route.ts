import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 401)
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || 'ALL'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const where: any = {}

  if (role !== 'ALL') {
    where.role = role
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } }
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        verificationLevel: true,
        reputationScore: true,
        balance: true,
        location: true,
        verifiedEmail: true,
        verifiedPhone: true,
        verifiedIdentity: true,
        verifiedAddress: true,
        createdAt: true,
        _count: {
          select: {
            plans: true,
            requests: true,
            sentConnections: true,
            receivedConnections: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count({ where })
  ])

  return NextResponse.json({
    users: users.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString()
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit)
  })
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 401)
  }

  try {
    const { userId, role } = await request.json()

    if (!userId || !role || !['USER', 'ADMIN'].includes(role)) {
      return apiError("Invalid input", 400)
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error('Error updating user role:', error)
    return apiError("Failed to update user role", 500)
  }
}