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

  const { id: planId } = await params
  const { email } = await request.json()

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { userId: true }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Only the plan owner can add editors' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const editor = await prisma.planEditor.create({
    data: {
      planId,
      userId: user.id
    }
  })

  return NextResponse.json(editor)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: planId } = await params
  const { searchParams } = new URL(request.url)
  const editorId = searchParams.get('editorId')

  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    select: { userId: true }
  })

  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  if (plan.userId !== session.user.id) {
    return NextResponse.json({ error: 'Only the plan owner can remove editors' }, { status: 403 })
  }

  await prisma.planEditor.delete({
    where: { id: editorId! }
  })

  return NextResponse.json({ success: true })
}
