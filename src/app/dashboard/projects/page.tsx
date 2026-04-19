import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import DashboardProjectsClient from './DashboardProjectsClient'

export const dynamic = 'force-dynamic'

export default async function DashboardProjects() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const plans = await prisma.plan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { requests: true, joiners: true } },
      user: { select: { id: true, name: true, image: true } },
      events: {
        select: { id: true, eventDate: true },
        take: 3,
        orderBy: { eventDate: 'desc' }
      }
    }
  })

  const serializedPlans = plans.map(plan => ({
    id: plan.id,
    title: plan.title,
    description: plan.description,
    category: plan.category,
    goals: plan.goals,
    status: plan.status,
    published: plan.published,
    pinned: plan.pinned,
    location: plan.location,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    requestCount: plan._count.requests,
    joinerCount: plan._count.joiners,
    user: plan.user,
    events: plan.events.map(e => ({
      id: e.id,
      eventDate: e.eventDate?.toISOString() || null
    }))
  }))

  return <DashboardProjectsClient initialPlans={serializedPlans} />
}