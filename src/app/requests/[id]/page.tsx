import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import RequestDetailClient from './RequestDetailClient'
import Breadcrumbs from '@/components/Breadcrumbs'

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
        { project: { userId: session?.user?.id } },
        { isPublic: true }
      ]
    },
    include: {
      project: {
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, shopSlug: true }
          }
        }
      },
      user: {
        select: { id: true, name: true, username: true, email: true, shopSlug: true, donationAddresses: { orderBy: { sortOrder: 'asc' } } }
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
            select: { id: true, name: true, username: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      fulfillments: {
        include: {
          user: {
            select: { id: true, name: true, username: true, shopSlug: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      _count: {
        select: { supports: true }
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
    currentFunding: request.currentFunding || 0,
    showDonationAddress: request.showDonationAddress,
    deadline: request.deadline?.toISOString() || null,
    location: request.location,
    likes: request.likes,
    reposts: request.reposts,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
    completedBy: request.completedBy,
    completedAt: request.completedAt?.toISOString() || null,
    allowFulfillments: request.allowFulfillments,
    imageUrl: (request as any).imageUrl || null,
    project: request.project ? {
      id: request.project.id,
      title: request.project.title,
      user: {
        id: request.project.user.id,
        name: request.project.user.name,
        username: request.project.user.username,
        shopSlug: request.project.user.shopSlug,
      },
    } : null,
    user: {
      id: request.user.id,
      name: request.user.name,
      username: request.user.username,
      shopSlug: request.user.shopSlug,
      donationAddresses: (request.user as any).donationAddresses?.map((da: any) => ({
        id: da.id,
        currency: da.currency,
        address: da.address,
        label: da.label,
        qrCodeUrl: da.qrCodeUrl,
        showQR: da.showQR,
        sortOrder: da.sortOrder,
      })) || [],
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
        username: comment.user.username,
        shopSlug: comment.user.shopSlug,
      },
    })),
    statusHistory: request.statusHistory.map(h => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedById,
      changedByName: h.changedBy.name || h.changedBy.username || 'Unknown',
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
        username: f.user.username,
        shopSlug: f.user.shopSlug,
      },
    })),
    supportCount: (request as any)._count?.supports || 0,
  }

  return (
    <>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Requests', href: '/requests' },
        { label: serializedRequest.title || 'Request' },
      ]} />
      <RequestDetailClient request={serializedRequest} userId={session?.user?.id || ''} userRole={userRole} />
    </>
  )
}
