import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PlanDetailClient from './PlanDetailClient'

export const dynamic = 'force-dynamic'

export default async function PlanDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const session = await getServerSession(authOptions)
  const { id } = await params
  const userId = session?.user?.id || ''
  const userRole = (session?.user as { role?: string })?.role || 'USER'
  
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, username: true, email: true } },
      editors: { select: { userId: true } },
      requests: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, username: true, email: true } },
          product: { select: { id: true, title: true, price: true, imageUrl: true } }
        }
      },
      events: {
        orderBy: { eventDate: 'asc' },
        include: {
          eventJoiners: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      },
      joiners: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      contributions: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } }
      }
    }
  })

  if (!plan) {
    redirect('/plans/public')
  }

  const isOwner = plan.userId === userId
  const isEditor = plan.editors.some(e => e.userId === userId)
  const isAdmin = userRole === 'ADMIN'
  const canEdit = isOwner || isEditor || isAdmin

  const serializedPlan = {
    ...plan,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    goals: plan.goals,
    mileposts: plan.mileposts,
    milepostStatus: plan.milepostStatus,
    schoolId: plan.schoolId,
    shopId: plan.shopId,
    requests: plan.requests.map(req => ({
      ...req,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
    })),
    isOwner,
    isEditor: canEdit,
    joiners: plan.joiners.map(j => ({
      ...j,
      joinedAt: j.joinedAt.toISOString(),
      user: { id: j.user.id, name: j.user.name, email: j.user.email }
    })),
    contributions: plan.contributions.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      user: { id: c.user.id, name: c.user.name, email: c.user.email }
    })),
    events: plan.events.map(event => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      eventDate: event.eventDate ? event.eventDate.toISOString() : null,
      endDate: event.endDate ? event.endDate.toISOString() : null,
      joiners: event.eventJoiners.map(j => ({
        ...j,
        joinedAt: j.joinedAt.toISOString()
      }))
    }))
  }

  return <PlanDetailClient plan={serializedPlan} userId={userId} isOwner={canEdit} />
}
