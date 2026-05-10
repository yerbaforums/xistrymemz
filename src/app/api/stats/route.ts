import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [members, shops, products, events] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { shopSlug: { not: null } } }),
      prisma.product.count({ where: { published: true } }),
      prisma.event.count({
        where: { eventDate: { gte: new Date() } }
      })
    ])
    
    return NextResponse.json({ members, shops, products, events })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ members: 0, shops: 0, products: 0, events: 0 })
  }
}
