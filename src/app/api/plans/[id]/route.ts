import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
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
      requests: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  return NextResponse.json(plan)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existingPlan = await prisma.plan.findUnique({
    where: { id }
  })

  if (!existingPlan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      title: body.title ?? existingPlan.title,
      description: body.description ?? existingPlan.description,
      status: body.status ?? existingPlan.status,
      goals: body.goals ?? existingPlan.goals,
      mileposts: body.mileposts ?? existingPlan.mileposts,
      milepostStatus: body.milepostStatus ?? existingPlan.milepostStatus,
      published: body.published ?? existingPlan.published,
      schoolId: body.schoolId ?? existingPlan.schoolId,
      shopId: body.shopId ?? existingPlan.shopId
    }
  })

  return NextResponse.json(plan)
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

  const existingPlan = await prisma.plan.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!existingPlan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  await prisma.plan.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}
