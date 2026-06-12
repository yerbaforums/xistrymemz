import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return apiError("Unauthorized", 401)
  }

  const { id: tripId, stopId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return apiError("Not found or no edit permission", 404)
  }

  const body = await request.json()
  const { productId } = body

  if (!productId) {
    return apiError("productId is required", 400)
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true }
  })

  if (!product) {
    return apiError("Product not found", 404)
  }

  const stop = await prisma.tripStop.findFirst({ where: { id: stopId, tripId } })
  if (!stop) {
    return apiError("Stop not found", 404)
  }

  const linkedProducts = (stop.linkedProducts as any[]) || []
  linkedProducts.push({ id: product.id, title: product.title })

  const updated = await prisma.tripStop.update({
    where: { id: stopId },
    data: { linkedProducts }
  })

  return apiSuccess(updated)
}
