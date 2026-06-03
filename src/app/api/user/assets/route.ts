import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface UserAsset {
  id: string
  type: 'PRODUCT' | 'SERVICE' | 'EVENT' | 'GROUP' | 'PLAN'
  title: string
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    const [products, events, groups, plans] = await Promise.all([
      prisma.product.findMany({
        where: { userId, published: true },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.event.findMany({
        where: { organizerId: userId },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.group.findMany({
        where: { userId },
        select: { id: true, name: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.plan.findMany({
        where: { userId, published: true },
        select: { id: true, title: true, imageUrl: true, location: true, latitude: true, longitude: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const assets: UserAsset[] = [
      ...products.map(p => ({ id: p.id, type: 'PRODUCT' as const, title: p.title, image: p.imageUrl, location: p.location, latitude: p.latitude, longitude: p.longitude })),
      ...events.map(e => ({ id: e.id, type: 'EVENT' as const, title: e.title, image: e.imageUrl, location: e.location, latitude: e.latitude, longitude: e.longitude })),
      ...groups.map(g => ({ id: g.id, type: 'GROUP' as const, title: g.name, image: g.imageUrl, location: g.location, latitude: g.latitude, longitude: g.longitude })),
      ...plans.map(p => ({ id: p.id, type: 'PLAN' as const, title: p.title, image: p.imageUrl, location: p.location, latitude: p.latitude, longitude: p.longitude })),
    ]

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('GET /api/user/assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
