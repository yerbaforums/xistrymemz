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

  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      joiners: true,
      _count: { select: { joiners: true } }
    }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.userId === session.user.id) {
    return NextResponse.json({ error: 'Cannot join your own event' }, { status: 400 })
  }

  const existingJoiner = await prisma.planJoiner.findUnique({
    where: {
      planId_userId: {
        planId: plan.id,
        userId: session.user.id
      }
    }
  })

  if (existingJoiner) {
    return NextResponse.json({ error: 'Already joined this event' }, { status: 400 })
  }

  const joiner = await prisma.planJoiner.create({
    data: {
      planId: plan.id,
      userId: session.user.id
    }
  })

  return NextResponse.json(joiner)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const joiner = await prisma.planJoiner.findUnique({
    where: {
      planId_userId: {
        planId: id,
        userId: session.user.id
      }
    }
  })

  if (!joiner) {
    return NextResponse.json({ error: 'Not joined this event' }, { status: 404 })
  }

  await prisma.planJoiner.delete({
    where: { id: joiner.id }
  })

  return NextResponse.json({ success: true })
}
