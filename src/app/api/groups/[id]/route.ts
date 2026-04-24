import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, image: true } },
        members: {
          include: { user: { select: { id: true, name: true, image: true, email: true } } }
        },
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        },
        _count: { select: { members: true, posts: true } }
      }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const isMember = userId ? group.members.some(m => m.userId === userId) : false
    const isAdmin = userId ? group.members.some(m => m.userId === userId && m.role === 'ADMIN') : false

    return NextResponse.json({ ...group, isMember, isAdmin })
  } catch (error) {
    console.error('GET /api/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { name, description, imageUrl, isPrivate } = await request.json()

    const member = await prisma.groupMember.findFirst({
      where: { groupId: id, userId: session.user.id, role: 'ADMIN' }
    })

    if (!member) {
      return NextResponse.json({ error: 'Only admins can update the group' }, { status: 403 })
    }

    const group = await prisma.group.update({
      where: { id },
      data: { name, description, imageUrl, isPrivate }
    })

    return NextResponse.json(group)
  } catch (error) {
    console.error('PUT /api/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const group = await prisma.group.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.userId !== session.user.id) {
      return NextResponse.json({ error: 'Only the creator can delete the group' }, { status: 403 })
    }

    await prisma.group.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/groups/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
