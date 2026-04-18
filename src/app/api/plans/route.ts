import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const plans = await prisma.plan.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      published: true,
      _count: {
        select: { requests: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(plans)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, goals, mileposts } = body

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const plan = await prisma.plan.create({
    data: {
      title,
      description,
      goals,
      mileposts,
      milepostStatus: '[]',
      userId: session.user.id,
      status: 'DRAFT'
    }
  })

  return NextResponse.json(plan)
}
