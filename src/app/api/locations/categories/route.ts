import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const categories = await prisma.locationCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' }
  })

  return apiSuccess(categories)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const body = await request.json()
  const { name, icon, color } = body

  if (!name?.trim()) {
    return apiError("Name is required", 400)
  }

  const category = await prisma.locationCategory.create({
    data: {
      name: name.trim(),
      icon: icon || '📍',
      color: color || '#3b82f6',
      userId: session.user.id
    }
  })

  return apiSuccess(category)
}
