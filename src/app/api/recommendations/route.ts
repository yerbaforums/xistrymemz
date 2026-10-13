import { NextRequest, apiSuccess, apiError, NextResponse } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, category, recommendation } = body

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation is required' },
        { status: 400 }
      )
    }

    await prisma.recommendation.create({
      data: {
        name: name || null,
        email: email || null,
        category: category || 'general',
        recommendation
      }
    })

    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    })

    if (admin && admin.email) {
    }

    return NextResponse.json({ 
      success: true,
      message: 'Thank you for your recommendation!'
    })
  } catch (error) {
    console.error('Recommendation error:', error)
    return NextResponse.json(
      { error: 'Failed to submit recommendation. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    // Recommendations contain submitter contact details —
    // admin-only read.
    if (session?.user?.role !== 'ADMIN') {
      return apiError("Unauthorized", 403)
    }

    const recommendations = await prisma.recommendation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return apiSuccess({ recommendations })
  } catch (error) {
    console.error('Get recommendations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}
