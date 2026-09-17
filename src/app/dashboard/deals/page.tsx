import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { EmptyState } from '@/components/EmptyState'
import styles from './deals.module.css'

export const dynamic = 'force-dynamic'

interface Deal {
  kind: 'Order' | 'Request' | 'Offer' | 'Appointment'
  id: string
  title: string
  counterpart: string
  status: string
  role: string
  href: string
  actionNeeded: boolean
  updatedAt: Date | null
  amount?: number | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--accent-warning, #f59e0b)',
  PAID: 'var(--accent-primary, #3b82f6)',
  SHIPPED: 'var(--accent-primary, #3b82f6)',
  ACCEPTED: '#22c55e',
  CONFIRMED: '#22c55e',
  IN_PROGRESS: '#f59e0b',
  DELIVERED: '#10b981',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280',
  REJECTED: '#ef4444',
  WITHDRAWN: '#6b7280',
}

const KIND_ICON: Record<string, string> = {
  Order: '📦',
  Request: '📝',
  Offer: '💼',
  Appointment: '🗓️',
}

export default async function DashboardDeals() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const [orders, requests, offers, appointments] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED'] }
      },
      include: {
        product: { select: { title: true } },
        buyer: { select: { name: true } },
        seller: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    }),
    prisma.request.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED'] }
      },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        budget: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    }),
    prisma.barterOffer.findMany({
      where: {
        OR: [{ makerId: userId }, { receiverId: userId }],
        status: { in: ['PENDING', 'ACCEPTED', 'COUNTERED', 'COMPLETED'] }
      },
      include: {
        maker: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    }),
    prisma.appointment.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: ['PENDING', 'CONFIRMED', 'PAID', 'COMPLETED'] }
      },
      include: {
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        serviceOffering: { select: { id: true, title: true } },
        product: { select: { id: true, title: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 30
    })
  ])

  const deals: Deal[] = [
    ...orders.map(o => ({
      kind: 'Order' as const,
      id: o.id,
      title: o.product?.title || o.description || 'Order',
      counterpart: o.buyerId === userId ? (o.seller.name || 'Seller') : (o.buyer.name || 'Buyer'),
      status: o.status,
      role: o.buyerId === userId ? 'Buyer' : 'Seller',
      href: `/orders/${o.id}`,
      actionNeeded: o.status === 'PAID' && o.buyerId === userId ? true : o.status === 'PENDING',
      updatedAt: o.updatedAt,
      amount: o.amount
    })),
    ...requests.map(r => ({
      kind: 'Request' as const,
      id: r.id,
      title: r.title,
      counterpart: 'You',
      status: r.status,
      role: 'Requester',
      href: `/requests/${r.id}`,
      actionNeeded: r.status === 'PENDING',
      updatedAt: r.updatedAt,
      amount: r.budget
    })),
    ...offers.map(o => ({
      kind: 'Offer' as const,
      id: o.id,
      title: o.listingTitle,
      counterpart: o.makerId === userId ? (o.receiver.name || 'Receiver') : (o.maker.name || 'Maker'),
      status: o.status,
      role: o.makerId === userId ? 'Maker' : 'Receiver',
      href: `/offers/${o.id}`,
      actionNeeded: o.status === 'PENDING' && o.makerId !== userId,
      updatedAt: o.updatedAt
    })),
    ...appointments.map(a => ({
      kind: 'Appointment' as const,
      id: a.id,
      title: (a as { serviceOffering?: { title: string } | null }).serviceOffering?.title || a.title,
      counterpart: a.buyerId === userId ? (a.seller.name || 'Seller') : (a.buyer.name || 'Buyer'),
      status: a.status,
      role: a.buyerId === userId ? 'Buyer' : 'Host',
      href: `/dashboard/appointments`,
      actionNeeded: a.status === 'PENDING' && a.buyerId !== userId,
      updatedAt: a.updatedAt
    }))
  ]

  deals.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))

  const active = deals.filter(d => !['COMPLETED', 'CANCELLED', 'REJECTED', 'WITHDRAWN', 'DELIVERED'].includes(d.status))
  const actionCount = deals.filter(d => d.actionNeeded).length
  const completed = deals.length - active.length

  return (
    <div className={styles.container}>
      <h1>🤝 My Deals</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Your active orders, requests, offers, and bookings — all in one place.</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{active.length}</span>
          <span className={styles.statLabel}>Active Deals</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: actionCount > 0 ? '#f59e0b' : undefined }}>{actionCount}</span>
          <span className={styles.statLabel}>Need Your Action</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{completed}</span>
          <span className={styles.statLabel}>{active.length === 0 ? 'Completed' : 'Finished'}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{deals.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className={styles.section}>
          <EmptyState
            icon="🤝"
            title="No deals yet"
            description="Browse the marketplace, post a request, or make an offer to start your first deal."
            action={{ label: 'Browse Marketplace', href: '/products' }}
          />
        </div>
      ) : (
        <div className={styles.section}>
          <h2>All Deals</h2>
          <div className={styles.list}>
            {deals.map(deal => (
              <Link key={`${deal.kind}-${deal.id}`} href={deal.href} className={styles.item}>
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>
                    {KIND_ICON[deal.kind]} {deal.title}
                  </span>
                  <span className={styles.itemMeta}>
                    {deal.kind} • {deal.role} • {deal.counterpart}
                    {deal.amount != null && deal.amount > 0 && ` • $${deal.amount.toFixed(2)}`}
                    {deal.actionNeeded && (
                      <span className={styles.actionBadge}>
                        ⚡ Action needed
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className={styles.itemStatus}
                  style={{ color: STATUS_COLOR[deal.status] || undefined, borderColor: STATUS_COLOR[deal.status] || undefined }}
                >
                  {deal.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}