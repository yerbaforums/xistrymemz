import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ratingSchema, validateBody } from '@/lib/schemas'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const productId = searchParams.get('productId')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    
    if (userId) {
      where.userId = userId
    }
    if (productId) {
      where.productId = productId
    }
    if (type) {
      where.type = type
    }

    const ratings = await prisma.rating.findMany({
      where,
      include: {
        rater: {
          select: { id: true, name: true, image: true }
        },
        user: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / ratings.length
      : 0

    return NextResponse.json({
      ratings,
      averageRating: Math.round(avgRating * 10) / 10,
      totalRatings: ratings.length
    })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateBody(ratingSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { userId, productId, rating, comment, type, transactionId } = validation.data

    const existing = await prisma.rating.findUnique({
      where: {
        raterId_userId: {
          raterId: session.user.id,
          userId
        }
      }
    })

    if (existing) {
      const updated = await prisma.rating.update({
        where: { id: existing.id },
        data: { rating, comment, type: type || 'SELLER' }
      })
      return NextResponse.json(updated)
    }

    const newRating = await prisma.rating.create({
      data: {
        raterId: session.user.id,
        userId,
        productId: productId || null,
        rating,
        comment: comment || null,
        type: type || 'SELLER',
        transactionId: transactionId || null
      },
      include: {
        rater: {
          select: { id: true, name: true, image: true }
        },
        user: {
          select: { id: true, name: true, image: true }
        }
      }
    })

    return NextResponse.json(newRating)
  } catch (error) {
    console.error('Error creating rating:', error)
    return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 })
  }
}
