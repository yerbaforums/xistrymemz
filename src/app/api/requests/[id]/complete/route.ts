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

  const req = await prisma.request.findFirst({
    where: {
      id,
      status: 'PENDING'
    },
    include: {
      user: true,
      plan: true
    }
  })

  if (!req) {
    return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 })
  }

  const isOwner = req.userId === session.user.id
  const userRole = (session.user as { role?: string }).role
  const isAdmin = userRole === 'ADMIN'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Only request owner can mark as purchased' }, { status: 403 })
  }

  const updatedRequest = await prisma.request.update({
    where: { id },
    data: { 
      status: 'COMPLETED',
      completedBy: body.completedBy || session.user.id,
      completedAt: new Date()
    }
  })

  await prisma.requestStatusHistory.create({
    data: {
      requestId: id,
      fromStatus: req.status,
      toStatus: 'COMPLETED',
      changedById: session.user.id,
      reason: body.message || 'Request completed by helper'
    }
  })

  if (body.message && req.userId) {
    await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: req.userId,
        content: body.message || 'I have completed your request! Let me know if you need anything else.'
      }
    })
  }

  await prisma.comment.create({
    data: {
      content: `Request completed by ${session.user.name || session.user.email}. ${body.message || ''}`.trim(),
      userId: session.user.id,
      requestId: id
    }
  })

  return NextResponse.json(updatedRequest)
}
