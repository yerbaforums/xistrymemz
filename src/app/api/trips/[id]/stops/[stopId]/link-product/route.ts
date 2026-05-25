import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; stopId: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: tripId, stopId } = await params

  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      collaborators: { some: { userId: session.user.id, role: { in: ['OWNER', 'EDITOR'] } } }
    }
  })

  if (!trip) {
    return NextResponse.json({ error: 'Not found or no edit permission' }, { status: 404 })
  }

  const body = await request.json()
  const { productId } = body

  if (!productId) {
    return NextResponse.json({ error: 'productId is required' }, { status: 400 })
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, title: true }
  })

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const stop = await prisma.tripStop.findFirst({ where: { id: stopId, tripId } })
  if (!stop) {
    return NextResponse.json({ error: 'Stop not found' }, { status: 404 })
  }

  const linkedProducts = (stop.linkedProducts as any[]) || []
  linkedProducts.push({ id: product.id, title: product.title })

  const updated = await prisma.tripStop.update({
    where: { id: stopId },
    data: { linkedProducts }
  })

  return NextResponse.json(updated)
}
