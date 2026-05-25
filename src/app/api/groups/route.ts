import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { groupSchema, validateBody } from '@/lib/schemas'

export async function GET(request: Request) {
  try {
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
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        isPrivate: true,
        category: true,
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { members: true, posts: true } },
        members: userId ? { where: { userId }, select: { id: true, role: true, userId: true } } : false
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(groups)
  } catch (error) {
    console.error('GET /api/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = validateBody(groupSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { name, description, privacy, category } = validation.data

    const group = await prisma.group.create({
      data: {
        name: name.trim(),
        description,
        category: category || 'GENERAL',
        isPrivate: privacy === 'PRIVATE',
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
  } catch (error) {
    console.error('POST /api/groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
