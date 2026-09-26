import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { EmptyState } from '@/components/EmptyState'
import DealRow from './DealRow'
import ConnectNudge from '@/components/ConnectNudge'
import styles from './deals.module.css'

export const dynamic = 'force-dynamic'

interface Deal {
  kind: 'Order' | 'Request' | 'Offer' | 'Appointment' | 'GroupBuy'
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

export default async function DashboardDeals() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const [orders, requests, offers, appointments, myBuys, myPledges, supplierRequests] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }, { courierId: userId }],
        status: { in: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] }
      },
      include: {
        product: { select: { title: true } },
        buyer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        courier: { select: { id: true, name: true } }
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
    }),
    // Group buys I organize (threshold watch + submit).
    prisma.groupBuy.findMany({
      where: { organizerId: userId, status: { in: ['ACTIVE', 'SUBMITTED'] } },
      select: {
        id: true, title: true, status: true, updatedAt: true,
        targetPrice: true, currentPrice: true,
        minSupporters: true, currentSupporters: true,
        groupId: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    }),
    // Buys I pledged to (supplier-request-live watch).
    prisma.groupBuySupporter.findMany({
      where: { userId },
      include: {
        groupBuy: {
          select: {
            id: true, title: true, status: true, updatedAt: true,
            targetPrice: true, groupId: true, organizerId: true
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: 20
    }),
    // My supplier requests (from group buys) with pending trade offers.
    prisma.request.findMany({
      where: { userId, description: { contains: '[groupbuy:' } },
      select: { id: true, title: true, description: true }
    })
  ])

  const supplierRequestIds = supplierRequests.map(r => r.id)
  const pendingOfferCounts = supplierRequestIds.length > 0
    ? await prisma.barterOffer.groupBy({
        by: ['listingId'],
        where: {
          listingId: { in: supplierRequestIds },
          listingType: 'REQUEST',
          receiverId: userId,
          status: { in: ['PENDING', 'COUNTERED'] }
        },
        _count: true
      })
    : []
  const pendingOffersByRequest = new Map(pendingOfferCounts.map(o => [o.listingId, o._count]))

  const deals: Deal[] = [
    ...orders.map(o => {
      const role = o.buyerId === userId ? 'Buyer' : o.sellerId === userId ? 'Seller' : 'Courier'
      const counterpart = role === 'Buyer'
        ? (o.seller.name || 'Seller')
        : role === 'Seller'
          ? (o.buyer.name || 'Buyer')
          : `${o.seller.name || 'Seller'} → ${o.buyer.name || 'Buyer'}`
      const courierLeg = (o as { courierStatus?: string | null }).courierStatus || null
      // Couriers act on their leg (REQUESTED → BOOKED → IN_TRANSIT → DELIVERED).
      const actionNeeded = role === 'Courier'
        ? courierLeg === 'REQUESTED' || courierLeg === 'BOOKED' || courierLeg === 'IN_TRANSIT'
        : o.status === 'PENDING' || o.status === 'PAID'
          ? role !== 'Buyer'
          : o.status === 'SHIPPED'
            ? role === 'Buyer'
            : false
      return {
        kind: 'Order' as const,
        id: o.id,
        title: o.product?.title || o.description || 'Order',
        counterpart,
        status: role === 'Courier' && courierLeg ? courierLeg : o.status,
        role,
        href: `/orders/${o.id}`,
        actionNeeded,
        updatedAt: o.updatedAt,
        amount: o.amount
      }
    }),
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
      href: `/dashboard/appointments?highlight=${a.id}`,
      actionNeeded: a.status === 'PENDING' && a.buyerId !== userId,
      updatedAt: a.updatedAt
    })),
    // Group buys I organize: threshold met → submit to supplier; pending trade
    // offers on my supplier requests need review.
    ...myBuys.map(b => {
      const met = b.currentSupporters >= b.minSupporters
      const pendingOffers = supplierRequests
        .filter(r => (r as { description?: string | null }).description?.includes(`[groupbuy:${b.id}]`))
        .reduce((sum, r) => sum + (pendingOffersByRequest.get(r.id) || 0), 0)
      return {
        kind: 'GroupBuy' as const,
        id: b.id,
        title: b.title,
        counterpart: `${b.currentSupporters}/${b.minSupporters} supporters`,
        status: b.status === 'ACTIVE' && met ? 'READY' : b.status,
        role: 'Organizer',
        href: `/groups/${b.groupId}`,
        actionNeeded: (b.status === 'ACTIVE' && met) || pendingOffers > 0,
        updatedAt: b.updatedAt,
        amount: b.targetPrice
      }
    }),
    // Buys I pledged to that went to a supplier: trade offers are open.
    // (Own buys are covered by the Organizer rows above.)
    ...myPledges
      .filter(p => p.groupBuy.status === 'SUBMITTED' && p.groupBuy.organizerId !== userId)
      .map(p => ({
        kind: 'GroupBuy' as const,
        id: p.groupBuy.id,
        title: p.groupBuy.title,
        counterpart: 'Pledged — supplier request live',
        status: 'SUBMITTED',
        role: 'Supporter',
        href: `/groups/${p.groupBuy.groupId}`,
        actionNeeded: false,
        updatedAt: p.groupBuy.updatedAt,
        amount: p.groupBuy.targetPrice
      }))
  ]

  deals.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0))

  // Nudge: follow the counterparty of the most recent finished order/booking.
  const finishedOrder = orders.find((o) => ['DELIVERED', 'COMPLETED'].includes(o.status))
  const finishedAppt = appointments.find((a) => ['COMPLETED'].includes(a.status))
  const nudge = finishedOrder
    ? {
        userId: finishedOrder.buyerId === userId ? finishedOrder.seller.id : finishedOrder.buyer.id,
        name: finishedOrder.buyerId === userId ? (finishedOrder.seller.name || 'Seller') : (finishedOrder.buyer.name || 'Buyer'),
        context: `your order “${(finishedOrder.product?.title || 'order').slice(0, 40)}”`,
      }
    : finishedAppt
      ? {
          userId: finishedAppt.buyerId === userId ? finishedAppt.seller.id : finishedAppt.buyer.id,
          name: finishedAppt.buyerId === userId ? (finishedAppt.seller.name || 'Host') : (finishedAppt.buyer.name || 'Guest'),
          context: `your booking “${finishedAppt.title.slice(0, 40)}”`,
        }
      : null

  const active = deals.filter(d => !['COMPLETED', 'CANCELLED', 'REJECTED', 'WITHDRAWN', 'DELIVERED'].includes(d.status))
  const actionCount = deals.filter(d => d.actionNeeded).length
  const completed = deals.length - active.length

  return (
    <div className={styles.container}>
      <h1>🤝 My Deals</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Your active orders, requests, offers, bookings, and group buys — all in one place.</p>

      {nudge && <ConnectNudge userId={nudge.userId} name={nudge.name} context={nudge.context} />}

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
              <DealRow key={`${deal.kind}-${deal.id}`} deal={deal} styles={styles} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}