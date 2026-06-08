import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import RequestsClient from './RequestsClient'
import { Suspense } from 'react'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || ''
  const userRole = (session?.user as { role?: string })?.role || 'USER'

  const where: Record<string, unknown> = {}

  if (userId) {
    where.OR = [
      { userId },
      { plan: { userId } },
      { plan: { editors: { some: { userId } } } },
      { isPublic: true }
    ]
  } else {
    where.OR = [
      { isPublic: true },
      { plan: { published: true } }
    ]
  }

  const requests = await prisma.request.findMany({
    where,
    include: {
      plan: { select: { id: true, title: true } },
      group: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
      schoolContent: { select: { id: true, title: true } },
      event: { select: { id: true, title: true } },
      user: {
        select: {
          id: true, name: true, username: true, email: true, image: true, shopSlug: true,
          donationAddresses: {
            where: { isPublic: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      _count: { select: { comments: true, fulfillments: true, supports: true, contributions: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const serializedRequests = requests.map(req => ({
    id: req.id,
    title: req.title,
    description: req.description,
    imageUrl: req.imageUrl,
    status: req.status,
    category: req.category,
    priority: req.priority,
    budget: req.budget,
    goalAmount: req.goalAmount,
    currentFunding: req.currentFunding,
    payoutAddress: req.payoutAddress,
    payoutCurrency: req.payoutCurrency,
    deadline: req.deadline?.toISOString() || null,
    location: req.location,
    latitude: req.latitude,
    longitude: req.longitude,
    likes: req.likes,
    reposts: req.reposts,
    isPublic: req.isPublic,
    allowFulfillments: req.allowFulfillments,
    showDonationAddress: req.showDonationAddress,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
    plan: req.plan,
    group: req.group,
    product: req.product,
    schoolContent: req.schoolContent,
    event: req.event,
    user: req.user,
    commentCount: req._count.comments,
    fulfillmentCount: req._count.fulfillments,
    supportCount: req._count.supports,
    contributionCount: req._count.contributions
  }))

  return (
    <>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Requests' },
      ]} />
      <Suspense fallback={<div style={{ padding: '48px' }}><Skeleton width="100%" height="300px" borderRadius="12px" /></div>}>
        <RequestsClient initialRequests={serializedRequests} userId={userId} userRole={userRole} isAuthenticated={!!userId} />
      </Suspense>
    </>
  )
}
