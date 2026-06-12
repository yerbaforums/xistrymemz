import { apiSuccess, apiError, apiUnauthorized, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 403)
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  const subscribers = await prisma.emailSubscriber.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  })

  return apiSuccess(subscribers)
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 403)
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "20")
  const skip = (page - 1) * limit

  if (id) {
    await prisma.emailSubscriber.delete({ where: { id } })
  } else {
    await prisma.emailSubscriber.deleteMany({ where: { subscribed: false } })
  }

  return apiSuccess({ success: true })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'ADMIN') {
    return apiError("Unauthorized", 403)
  }

  const { email, name } = await request.json()

  if (!email) {
    return apiError("Email is required", 400)
  }

  const subscriber = await prisma.emailSubscriber.upsert({
    where: { email },
    update: { subscribed: true },
    create: { email, name, source: 'manual' }
  })

  return apiSuccess(subscriber)
}
