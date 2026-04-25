import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { type, id, pinned } = await request.json()

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID required' }, { status: 400 })
    }

    const isPinned = pinned !== undefined ? pinned : true

    switch (type) {
      case 'post': {
        const post = await prisma.post.findUnique({ where: { id } })
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        if (post.userId !== session.user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        
        await prisma.post.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'plan': {
        const plan = await prisma.plan.findUnique({ where: { id } })
        if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
        if (plan.userId !== session.user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        
        await prisma.plan.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'product': {
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
        if (product.userId !== session.user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        
        await prisma.product.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'event': {
        const event = await prisma.event.findUnique({ where: { id } })
        if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
        
        const isOwner = event.organizerId === session.user.id
        const userRole = (session.user as { role?: string }).role
        const isAdmin = userRole === 'ADMIN'
        if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        
        await prisma.event.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, pinned: isPinned })
  } catch (error) {
    console.error('Error pinning item:', error)
    return NextResponse.json({ error: 'Failed to pin item' }, { status: 500 })
  }
}
