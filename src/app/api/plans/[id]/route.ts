import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = plan.userId === session.user.id
    const isEditor = await prisma.planEditor.findFirst({
      where: { planId: id, userId: session.user.id }
    })

    if (!isOwner && !isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error('GET /api/plans/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

    const existingPlan = await prisma.plan.findUnique({
      where: { id }
    })

    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'
    const isOwner = existingPlan.userId === session.user.id
    const isEditor = await prisma.planEditor.findFirst({
      where: { planId: id, userId: session.user.id }
    })

    if (!isOwner && !isEditor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        title: body.title ?? existingPlan.title,
        description: body.description ?? existingPlan.description,
        status: body.status ?? existingPlan.status,
        goals: body.goals !== undefined ? body.goals : existingPlan.goals,
        mileposts: body.mileposts !== undefined ? body.mileposts : existingPlan.mileposts,
        milepostStatus: body.milepostStatus !== undefined ? body.milepostStatus : existingPlan.milepostStatus,
        published: body.published ?? existingPlan.published,
        resources: body.resources !== undefined ? body.resources : existingPlan.resources,
        schoolId: body.schoolId ?? existingPlan.schoolId,
        shopId: body.shopId ?? existingPlan.shopId,
        lookingForCollaborators: body.lookingForCollaborators ?? existingPlan.lookingForCollaborators,
        acceptsDonations: body.acceptsDonations !== undefined ? body.acceptsDonations : existingPlan.acceptsDonations,
        donationAddress: body.donationAddress !== undefined ? (body.donationAddress || null) : existingPlan.donationAddress,
        donationCurrency: body.donationCurrency ?? existingPlan.donationCurrency,
        donationDescription: body.donationDescription !== undefined ? (body.donationDescription || null) : existingPlan.donationDescription,
        donationAddresses: body.donationAddresses !== undefined ? (body.donationAddresses || null) : existingPlan.donationAddresses
      }
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('PUT /api/plans/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
  } catch (error) {
    console.error('DELETE /api/plans/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
