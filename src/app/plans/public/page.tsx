import { prisma } from '@/lib/prisma'
import PublicPlansClient from './PublicPlansClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PublicPlansPage() {
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
      status: true,
      published: true,
      pinned: true,
      location: true,
      locationDetails: true,
      latitude: true,
      longitude: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { requests: true, joiners: true } },
      events: {
        select: {
          id: true,
          title: true,
          eventDate: true,
          endDate: true,
          location: true,
          latitude: true,
          longitude: true,
          maxJoiners: true,
          eventJoiners: { select: { userId: true } }
        }
      },
      requests: {
        where: { status: 'PENDING' },
        select: {
          id: true,
          title: true,
          category: true,
          budget: true
        }
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

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <nav className="breadcrumbs" style={{ marginBottom: '16px' }}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/dashboard/overview" className="breadcrumb-link">Dashboard</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">Browse Projects</span>
      </nav>
      <PublicPlansClient initialPlans={serializedPlans} />
    </div>
  )
}
