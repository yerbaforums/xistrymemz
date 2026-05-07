import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const members = await prisma.user.count()
    const shops = await prisma.user.count({ where: { shopSlug: { not: null } } })
    const products = await prisma.product.count()
    
    return NextResponse.json({ members, shops, products, events: 0 })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ members: 0, shops: 0, products: 0, events: 0 })
  }
}
