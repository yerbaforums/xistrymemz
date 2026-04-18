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
    const { toStatus, reason } = body

    if (!toStatus) {
      return NextResponse.json({ error: 'toStatus is required' }, { status: 400 })
    }

    const plan = await prisma.plan.findUnique({
      where: { id },
      select: { userId: true, status: true }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const isOwner = plan.userId === session.user.id
    const isEditor = await prisma.planEditor.findFirst({
      where: { planId: id, userId: session.user.id }
    })
    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'

    if (!isOwner && !isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: { status: toStatus }
    })

    await prisma.planStatusHistory.create({
      data: {
        planId: id,
        fromStatus: plan.status,
        toStatus,
        reason: reason || null
      }
    })

    return NextResponse.json({
      ...updatedPlan,
      createdAt: updatedPlan.createdAt.toISOString(),
      updatedAt: updatedPlan.updatedAt.toISOString()
    })
  } catch (error) {
    console.error('Error rolling back plan status:', error)
    return NextResponse.json({ error: 'Failed to rollback status' }, { status: 500 })
  }
}
