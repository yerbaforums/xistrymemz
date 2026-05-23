import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { serviceOfferingSchema, validateBody } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const location = searchParams.get('location')
    const search = searchParams.get('q')
    const sort = searchParams.get('sort') || 'newest'

    const where: Record<string, unknown> = { isActive: true }

    if (category && category !== 'ALL') {
      where.category = category
    }
    if (location && location !== 'ALL') {
      where.location = location
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const services = await prisma.serviceOffering.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
      orderBy: sort === 'price-low'
        ? { price: 'asc' }
        : sort === 'price-high'
        ? { price: 'desc' }
        : sort === 'duration'
        ? { duration: 'asc' }
        : { createdAt: 'desc' },
    })

    return NextResponse.json({ services })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = await validateBody(serviceOfferingSchema, body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const service = await prisma.serviceOffering.create({
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        category: parsed.data.category,
        duration: parsed.data.duration,
        price: parsed.data.price || null,
        location: parsed.data.location || null,
        meetingLink: parsed.data.meetingLink || null,
        imageUrl: parsed.data.imageUrl || null,
        isActive: parsed.data.isActive ?? true,
        userId: session.user.id,
      },
      include: {
        user: { select: { id: true, name: true, image: true, username: true } },
      },
    })

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Error creating service:', error)
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
  }
}
