import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardRequestsClient from './DashboardRequestsClient'

export const dynamic = 'force-dynamic'

export default async function DashboardRequests() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id
  const userRole = (session.user as { role?: string })?.role || 'USER'

  const requests = await prisma.request.findMany({
    where: userRole === 'ADMIN' ? undefined : { userId },
    include: {
      plan: { select: { id: true, title: true } },
      group: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
      schoolContent: { select: { id: true, title: true } },
      event: { select: { id: true, title: true } },
      user: {
        select: {
          id: true, name: true, email: true, image: true, shopSlug: true,
          donationAddresses: {
            where: { isPublic: true },
            orderBy: { sortOrder: 'asc' }
          }
        }
      },
      _count: { select: { comments: true, fulfillments: true, supports: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  const serializedRequests = requests.map(req => ({
    id: req.id,
    title: req.title,
    description: req.description,
    status: req.status,
    category: req.category,
    priority: req.priority,
    budget: req.budget,
    goalAmount: req.goalAmount,
    currentFunding: req.currentFunding || 0,
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
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      image: req.user.image,
      shopSlug: (req.user as any).shopSlug,
      donationAddresses: ((req.user as any).donationAddresses || []).map((da: any) => ({
        id: da.id,
        currency: da.currency,
        address: da.address,
        label: da.label,
        qrCodeUrl: da.qrCodeUrl,
        showQR: da.showQR,
        sortOrder: da.sortOrder,
      })),
    },
    commentCount: req._count.comments,
    fulfillmentCount: req._count.fulfillments,
    supportCount: req._count.supports,
  }))

  return <DashboardRequestsClient initialRequests={serializedRequests} userId={userId} userRole={userRole} />
}
