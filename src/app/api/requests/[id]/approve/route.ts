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

  const existingRequest = await prisma.request.findFirst({
    where: {
      id,
      plan: { userId: session.user.id }
    }
  })

  if (!existingRequest) {
    return NextResponse.json({ error: 'Request not found or unauthorized' }, { status: 404 })
  }

  const req = await prisma.request.update({
    where: { id },
    data: { status: 'APPROVED' }
  })

  await prisma.requestStatusHistory.create({
    data: {
      requestId: id,
      fromStatus: existingRequest.status,
      toStatus: 'APPROVED',
      changedById: session.user.id,
      reason: 'Approved by project owner'
    }
  })

  return NextResponse.json(req)
}
