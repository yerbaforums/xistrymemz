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

  const req = await prisma.request.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { plan: { userId: session.user.id } }
      ]
    },
    include: {
      plan: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, email: true }
      },
      product: {
        select: { id: true, title: true, price: true, imageUrl: true }
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!req) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  return NextResponse.json(req)
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

  const existingRequest = await prisma.request.findFirst({
    where: {
      id,
      OR: [
        { userId: session.user.id },
        { plan: { userId: session.user.id } }
      ]
    }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const newStatus = body.status ?? existingRequest.status
  
  const req = await prisma.request.update({
    where: { id },
    data: {
      title: body.title ?? existingRequest.title,
      description: body.description ?? existingRequest.description,
      status: newStatus,
      category: body.category ?? existingRequest.category,
      priority: body.priority ?? existingRequest.priority,
      budget: body.budget !== undefined ? body.budget : existingRequest.budget,
      deadline: body.deadline ? new Date(body.deadline) : existingRequest.deadline
    }
  })

  if (newStatus !== existingRequest.status) {
    await prisma.requestStatusHistory.create({
      data: {
        requestId: id,
        fromStatus: existingRequest.status,
        toStatus: newStatus,
        changedById: session.user.id,
        reason: body.statusReason || 'Status updated'
      }
    })
  }

  return NextResponse.json(req)
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

  const existingRequest = await prisma.request.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  await prisma.request.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  const existingRequest = await prisma.request.findFirst({
    where: {
      id,
      userId: session.user.id
    }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const req = await prisma.request.update({
    where: { id },
    data: {
      goalAmount: body.goalAmount !== undefined ? body.goalAmount : existingRequest.goalAmount,
      payoutAddress: body.payoutAddress !== undefined ? body.payoutAddress : existingRequest.payoutAddress,
      payoutCurrency: body.payoutCurrency || existingRequest.payoutCurrency
    }
  })

  return NextResponse.json(req)
}
