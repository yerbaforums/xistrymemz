import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscribers = await prisma.emailSubscriber.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(subscribers)
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    await prisma.emailSubscriber.delete({ where: { id } })
  } else {
    await prisma.emailSubscriber.deleteMany({ where: { subscribed: false } })
  }

  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email, name } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const subscriber = await prisma.emailSubscriber.upsert({
    where: { email },
    update: { subscribed: true },
    create: { email, name, source: 'manual' }
  })

  return NextResponse.json(subscriber)
}
