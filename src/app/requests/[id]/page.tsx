import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RequestDetailClient from './RequestDetailClient'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  const userRole = (session?.user as { role?: string })?.role || 'USER'
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
            select: { id: true, name: true, username: true, email: true, shopSlug: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, username: true, email: true, shopSlug: true }
      },
      product: {
        select: { id: true, title: true, price: true, imageUrl: true }
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, shopSlug: true }
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
      },
      fulfillments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, shopSlug: true }
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
    goalAmount: request.goalAmount,
    currentFunding: request.currentFunding,
    payoutAddress: request.payoutAddress,
    payoutCurrency: request.payoutCurrency,
    deadline: request.deadline?.toISOString() || null,
    location: request.location,
    likes: request.likes,
    reposts: request.reposts,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    completedBy: request.completedBy,
    completedAt: request.completedAt?.toISOString() || null,
    allowFulfillments: request.allowFulfillments,
    plan: request.plan ? {
      id: request.plan.id,
      title: request.plan.title,
      user: {
        id: request.plan.user.id,
        name: request.plan.user.name,
        email: request.plan.user.email,
        shopSlug: request.plan.user.shopSlug,
      },
    } : null,
    user: {
      id: request.user.id,
      name: request.user.name,
      email: request.user.email,
      shopSlug: request.user.shopSlug,
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
        shopSlug: comment.user.shopSlug,
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
    fulfillments: request.fulfillments.map(f => ({
      id: f.id,
      title: f.title,
      content: f.content,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      user: {
        id: f.user.id,
        name: f.user.name,
        email: f.user.email,
        shopSlug: f.user.shopSlug,
      },
    })),
  }

  return <RequestDetailClient request={serializedRequest} userId={session?.user?.id || ''} userRole={userRole} />
}
