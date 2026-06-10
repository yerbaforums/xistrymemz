import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const amount = parseFloat(body.amount)

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({ where: { id } })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    if (!plan.acceptsDonations) {
      return NextResponse.json({ error: 'This plan does not accept donations' }, { status: 400 })
    }

    const [contribution] = await prisma.$transaction([
      prisma.planContribution.create({
        data: {
          amount,
          message: body.message || null,
          planId: id,
          userId: session.user.id
        }
      }),
      prisma.plan.update({
        where: { id },
        data: {
          currentFunding: (plan.currentFunding || 0) + amount
        }
      })
    ])

    return NextResponse.json(contribution)
  } catch (error) {
    console.error('POST /api/plans/[id]/contribute:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
