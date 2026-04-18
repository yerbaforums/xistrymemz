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
      plan: { userId: session.user.id }
    }
  })

  if (!req) {
    return NextResponse.json({ error: 'Request not found or unauthorized' }, { status: 404 })
  }

  const updatedRequest = await prisma.request.update({
    where: { id },
    data: { 
      status: body.toStatus,
      completedBy: body.toStatus === 'COMPLETED' ? null : req.completedBy,
      completedAt: body.toStatus === 'COMPLETED' ? new Date() : null
    }
  })

  await prisma.comment.create({
    data: {
      content: `Status rolled back from ${req.status} to ${body.toStatus}. ${body.reason || ''}`.trim(),
      userId: session.user.id,
      requestId: id
    }
  })

  return NextResponse.json(updatedRequest)
}
