import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const my = searchParams.get('my')
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  let where = {}

  if (my === 'true' && userId) {
    where = {
      members: { some: { userId } }
    }
  }

  const groups = await prisma.group.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true, posts: true } },
      members: userId ? { where: { userId }, select: { id: true, role: true, userId: true } } : false
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json(groups)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, description, imageUrl, isPrivate } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  const group = await prisma.group.create({
    data: {
      name: name.trim(),
      description,
      imageUrl,
      isPrivate: isPrivate || false,
      userId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'ADMIN'
        }
      }
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true, posts: true } }
    }
  })

  return NextResponse.json(group)
}
