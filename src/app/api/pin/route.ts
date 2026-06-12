import { NextRequest, apiSuccess, apiError, apiUnauthorized, apiServerError, NextResponse } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return apiError("Unauthorized", 401)
    }

    const { type, id, pinned } = await request.json()

    if (!type || !id) {
      return apiError("Type and ID required", 400)
    }

    const isPinned = pinned !== undefined ? pinned : true

    switch (type) {
      case 'post': {
        const post = await prisma.post.findUnique({ where: { id } })
        if (!post) return apiError("Post not found", 404)
        if (post.userId !== session.user.id) return apiError("Not authorized", 403)
        
        await prisma.post.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'plan': {
        const plan = await prisma.plan.findUnique({ where: { id } })
        if (!plan) return apiError("Plan not found", 404)
        if (plan.userId !== session.user.id) return apiError("Not authorized", 403)
        
        await prisma.plan.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'product': {
        const product = await prisma.product.findUnique({ where: { id } })
        if (!product) return apiError("Product not found", 404)
        if (product.userId !== session.user.id) return apiError("Not authorized", 403)
        
        await prisma.product.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'event': {
        const event = await prisma.event.findUnique({ where: { id } })
        if (!event) return apiError("Event not found", 404)
        
        const isOwner = event.organizerId === session.user.id
        const userRole = (session.user as { role?: string }).role
        const isAdmin = userRole === 'ADMIN'
        if (!isOwner && !isAdmin) return apiError("Not authorized", 403)
        
        await prisma.event.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'schoolContent': {
        const sc = await prisma.schoolContent.findUnique({ where: { id } })
        if (!sc) return apiError("Content not found", 404)
        if (sc.userId !== session.user.id) return apiError("Not authorized", 403)
        
        await prisma.schoolContent.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      case 'groupPost': {
        const gp = await prisma.groupPost.findUnique({ where: { id } })
        if (!gp) return apiError("Post not found", 404)
        if (gp.userId !== session.user.id) return apiError("Not authorized", 403)
        
        await prisma.groupPost.update({
          where: { id },
          data: { pinned: isPinned }
        })
        break
      }
      
      default:
        return apiError("Invalid type", 400)
    }

    return NextResponse.json({ success: true, pinned: isPinned })
  } catch (error) {
    console.error('Error pinning item:', error)
    return apiError("Failed to pin item", 500)
  }
}
