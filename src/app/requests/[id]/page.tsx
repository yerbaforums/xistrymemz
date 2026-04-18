import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RequestDetailClient from './RequestDetailClient'

export default async function RequestDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  
  const request = await prisma.request.findFirst({
    where: {
      id,
      OR: [
        { userId: session?.user?.id },
        { plan: { userId: session?.user?.id } },
        { isPublic: true }
      ]
    },
    include: {
      plan: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, email: true }
      },
      product: {
        select: { id: true, title: true, price: true, imageUrl: true }
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      },
      statusHistory: {
        include: {
          changedBy: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!request) {
    redirect('/requests')
  }

  const serializedRequest = {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    category: request.category || 'GENERAL',
    priority: request.priority || 'MEDIUM',
    budget: request.budget,
    deadline: request.deadline?.toISOString() || null,
    location: request.location,
    likes: request.likes,
    reposts: request.reposts,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    completedBy: request.completedBy,
    completedAt: request.completedAt?.toISOString() || null,
    plan: request.plan ? {
      id: request.plan.id,
      title: request.plan.title,
      user: {
        id: request.plan.user.id,
        name: request.plan.user.name,
        email: request.plan.user.email,
      },
    } : null,
    user: {
      id: request.user.id,
      name: request.user.name,
      email: request.user.email,
    },
    product: request.product ? {
      id: request.product.id,
      title: request.product.title,
      price: request.product.price,
      imageUrl: request.product.imageUrl,
    } : null,
    comments: request.comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      user: {
        id: comment.user.id,
        name: comment.user.name,
        email: comment.user.email,
      },
    })),
    statusHistory: request.statusHistory.map(h => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedById,
      changedByName: h.changedBy.name || h.changedBy.email,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  }

  return <RequestDetailClient request={serializedRequest} userId={session?.user?.id || ''} />
}
