import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PlansClient from './PlansClient'
import { Suspense } from 'react'
import Loading from '@/components/Loading'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const session = await getServerSession(authOptions)
  
  const plans = await prisma.plan.findMany({
    where: { userId: session?.user?.id },
    select: {
      id: true,
      title: true,
      description: true,
      goals: true,
      mileposts: true,
      milepostStatus: true,
      status: true,
      published: true,
      pinned: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { requests: true, joiners: true }
      },
      requests: {
        select: { status: true }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { createdAt: 'desc' }
    ]
  })

  const serializedPlans = plans.map(plan => {
    const completedRequests = plan.requests.filter(r => r.status === 'APPROVED').length
    const totalRequests = plan.requests.length
    const progress = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0
    
    return {
      ...plan,
      progress,
      completedRequests,
      requests: undefined,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }
  })

  return (
    <Suspense fallback={<Loading message="Loading projects..." />}>
      <PlansClient initialPlans={serializedPlans} />
    </Suspense>
  )
}