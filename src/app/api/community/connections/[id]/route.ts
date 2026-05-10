import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()
    const { id } = await context.params

    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be PENDING, ACCEPTED, or REJECTED' }, { status: 400 })
    }

    const connection = await prisma.connection.findUnique({
      where: { id }
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updated = await prisma.connection.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json({ connection: updated })
  } catch (error) {
    console.error('Error updating connection:', error)
    return NextResponse.json({ error: 'Failed to update connection' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const connection = await prisma.connection.findUnique({
      where: { id }
    })

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
    }

    if (connection.requesterId !== session.user.id && connection.receiverId !== session.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    await prisma.connection.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting connection:', error)
    return NextResponse.json({ error: 'Failed to delete connection' }, { status: 500 })
  }
}
