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

    const userRole = (session.user as { role?: string }).role
    const isAdmin = userRole === 'ADMIN'

    const existingRequest = await prisma.request.findFirst({
      where: isAdmin
        ? { id }
        : { id, plan: { userId: session.user.id } }
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found or unauthorized' }, { status: 404 })
    }

    const req = await prisma.request.update({
      where: { id },
      data: { status: 'REJECTED' }
    })

    await prisma.requestStatusHistory.create({
      data: {
        requestId: id,
        fromStatus: existingRequest.status,
        toStatus: 'REJECTED',
        changedById: session.user.id,
        reason: isAdmin ? 'Rejected by admin' : 'Rejected by project owner'
      }
    })

    return NextResponse.json(req)
  } catch (error) {
    console.error('POST /api/requests/[id]/reject:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
