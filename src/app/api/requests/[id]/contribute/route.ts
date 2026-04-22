import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const fundingRequest = await prisma.request.findFirst({
    where: {
      id,
      goalAmount: { gt: 0 }
    }
  })

  if (!fundingRequest) {
    return NextResponse.json({ error: 'Funding request not found or not active' }, { status: 404 })
  }

  const contribution = await prisma.contribution.create({
    data: {
      amount,
      requestId: id,
      userId: session.user.id
    }
  })

  await prisma.request.update({
    where: { id },
    data: {
      currentFunding: (fundingRequest.currentFunding || 0) + amount
    }
  })

  return NextResponse.json(contribution)
}