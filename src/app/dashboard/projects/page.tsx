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

  const projects = await prisma.project.findMany({
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

  const serializedProjects = projects.map(project => ({
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category,
    goals: project.goals,
    resources: project.resources,
    needsVolunteers: project.needsVolunteers,
    lookingForCollaborators: project.lookingForCollaborators,
    status: project.status,
    published: project.published,
    pinned: project.pinned,
    location: project.location,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    requestCount: project._count.requests,
    joinerCount: project._count.joiners,
    user: project.user,
    events: project.events.map(e => ({
      id: e.id,
      eventDate: e.eventDate?.toISOString() || null
    }))
  }))

  return <DashboardProjectsClient initialProjects={serializedProjects} />
}