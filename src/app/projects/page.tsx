import { prisma } from '@/lib/prisma'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const plans = await prisma.plan.findMany({
    where: {
      OR: [
        { status: 'ACTIVE', published: true },
        { status: 'COMPLETED', published: true }
      ]
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      goals: true,
      mileposts: true,
      images: true,
      videoUrl: true,
      status: true,
      published: true,
      pinned: true,
      location: true,
      locationDetails: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      goalAmount: true,
      currentFunding: true,
      user: { select: { id: true, name: true, username: true, image: true } },
      _count: { select: { requests: true, joiners: true } },
      events: {
        select: {
          id: true, title: true, eventDate: true, endDate: true,
          location: true, latitude: true, longitude: true, maxJoiners: true,
          eventJoiners: { select: { userId: true } }
        }
      },
      requests: {
        where: { status: 'PENDING' },
        select: { id: true, title: true, category: true, budget: true }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { updatedAt: 'desc' }
    ]
  })

  const serializedPlans = plans.map(plan => ({
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    events: plan.events.map(e => ({
      ...e,
      eventDate: e.eventDate?.toISOString() || null,
      endDate: e.endDate?.toISOString() || null,
      joiners: e.eventJoiners
    }))
  }))

  return <ProjectsClient initialPlans={serializedPlans} />
}
