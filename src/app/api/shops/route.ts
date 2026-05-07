import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const shops = await prisma.user.findMany({
      where: {
        shopSlug: { not: null },
        shopName: { not: '' }
      },
      select: {
        id: true,
        shopName: true,
        shopAbout: true,
        shopImage: true,
        shopSlug: true,
        name: true,
        location: true,
        latitude: true,
        longitude: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ shops })
  } catch (error) {
    console.error('Error fetching shops:', error)
    return NextResponse.json({ error: 'Failed to fetch shops' }, { status: 500 })
  }
}
