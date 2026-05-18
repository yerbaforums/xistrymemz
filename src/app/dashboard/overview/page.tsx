import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import FeedItem from '@/components/FeedItem'
import styles from '../page.module.css'
import overviewStyles from './OverviewCards.module.css'
import TipCard from './TipCard'
import ChecklistCard from './ChecklistCard'
import FeatureBanner from './FeatureBanner'

export const dynamic = 'force-dynamic'

function StatGauge({ value, max = 100, size = 48, color = 'var(--accent-primary)' }: { value: number; max?: number; size?: number; color?: string }) {
  const pct = Math.min(Math.max(value / max, 0), 1)
  const r = 20
  const c = 2 * Math.PI * r
  const offset = c - pct * c
  const fontSize = value >= 1000 ? 7 : value >= 100 ? 8 : 10

  return (
    <svg viewBox="0 0 48 48" width={size} height={size}>
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="3.5" />
      <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="3.5"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 24 24)" />
      <text x="24" y="24" textAnchor="middle" dominantBaseline="central"
        fill="var(--text-primary)" fontSize={fontSize} fontWeight="700">{value}</text>
    </svg>
  )
}

interface StatDef {
  label: string
  value: number
  max: number
  color: string
  icon: string
  href: string
}

export default async function DashboardOverview() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const [
    _plans,
    _requests,
    products,
    groupMemberships,
    connectionCount,
    connectionActivity,
    orderStats,
    rentalCount,
    teachingEarnings,
    sellerEarnings
  ] = await Promise.all([
    prisma.plan.findMany({ 
      where: { userId }, 
      select: { id: true, title: true, status: true, published: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.request.findMany({ 
      where: { userId }, 
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.product.findMany({ 
      where: { userId }, 
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.groupMember.findMany({ 
      where: { userId }, 
      include: { group: { select: { id: true, name: true } } },
      take: 5
    }),
    prisma.connection.count({ 
      where: { 
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: 'ACCEPTED'
      }
    }),
    prisma.connection.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }]
      },
      include: {
        requester: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } }
      },
      take: 10
    }),
    prisma.escrowTransaction.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }, { courierId: userId }]
      },
      select: { id: true, status: true, paymentType: true, deliveryStatus: true }
    }),
    prisma.product.count({ where: { userId, type: 'RENTAL' } }),
    prisma.schoolPurchase.aggregate({
      where: {
        content: { userId },
        status: 'COMPLETED'
      },
      _sum: { amount: true }
    }),
    prisma.escrowTransaction.aggregate({
      where: {
        sellerId: userId,
        status: 'RELEASED'
      },
      _sum: { netAmount: true }
    })
  ])

  void products
  void groupMemberships

  const connectedUserIds = connectionActivity.map(c => 
    c.requesterId === userId ? c.receiverId : c.requesterId
  )

  const [recentPlans, recentProducts, recentFeedPosts, eventJoinerCounts] = await Promise.all([
    prisma.plan.findMany({
      where: { userId: { in: connectedUserIds }, published: true },
      select: { id: true, title: true, status: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.product.findMany({
      where: { userId: { in: connectedUserIds }, published: true },
      select: { id: true, title: true, type: true, createdAt: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5
    }),
    prisma.post.findMany({
      where: { userId: { in: [...connectedUserIds, userId] } },
      include: {
        user: { select: { id: true, name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    }),
    prisma.eventJoiner.groupBy({
      by: ['role'],
      where: { userId },
      _count: true
    })
  ])

  const connectionFeed = [
    ...recentPlans.map(p => ({ feedType: 'plan' as const, id: p.id, title: p.title, status: p.status, createdAt: p.createdAt, userName: p.user.name })),
    ...recentProducts.map(p => ({ feedType: 'product' as const, id: p.id, title: p.title, type: p.type, createdAt: p.createdAt, userName: p.user.name }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { name: true, bio: true, shopSlug: true, schoolSlug: true, walletAddress: true, paymentAddress: true, refundAddress: true, cryptoCurrency: true, donationAddress: true, donationCurrency: true, acceptsDonations: true }
  })

  const allStats = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.request.count({ where: { userId } }),
    prisma.product.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.eventJoiner.count({ where: { userId } }),
    prisma.schoolContent.count({ where: { userId } }),
    prisma.post.count({ where: { userId } }),
  ])

  const [offersSent, offersReceived] = await Promise.all([
    prisma.barterOffer.count({ where: { makerId: userId } }),
    prisma.barterOffer.count({ where: { receiverId: userId } }),
  ])

  const plans = _plans
  const requests = _requests

  void products
  void groupMemberships
  
  const pendingRequests = requests.filter((r: { status: string }) => r.status === 'PENDING').length
  const eventAttendeeCount = eventJoinerCounts.find(r => r.role === 'ATTENDEE')?._count ?? 0
  const eventVolunteerCount = eventJoinerCounts.find(r => r.role === 'VOLUNTEER')?._count ?? 0
  const totalEarnings = (sellerEarnings._sum.netAmount ?? 0) + (teachingEarnings._sum.amount ?? 0)

  const stats: StatDef[] = [
    { label: 'Projects', value: allStats[0], max: 20, color: '#8B5CF6', icon: '🚀', href: '/dashboard/projects' },
    { label: 'Requests', value: pendingRequests, max: 20, color: '#F59E0B', icon: '📝', href: '/dashboard/requests' },
    { label: 'Products', value: allStats[2], max: 50, color: '#10B981', icon: '🛒', href: '/dashboard/marketplace' },
    { label: 'Rentals', value: rentalCount, max: 20, color: '#3B82F6', icon: '🏠', href: '/dashboard/rentals' },
    { label: 'Teacngs', value: allStats[5], max: 20, color: '#EC4899', icon: '🏫', href: '/dashboard/teaching' },
    { label: 'Offers In', value: offersReceived, max: 20, color: '#F97316', icon: '🤝', href: '/dashboard/offers' },
    { label: 'Offers Out', value: offersSent, max: 20, color: '#FB923C', icon: '📤', href: '/dashboard/offers' },
    { label: 'Connectns', value: connectionCount, max: 100, color: '#06B6D4', icon: '👥', href: '/community' },
    { label: 'Groups', value: allStats[3], max: 20, color: '#84CC16', icon: '🏠', href: '/community/groups' },
    { label: 'Events', value: eventAttendeeCount, max: 20, color: '#6366F1', icon: '📅', href: '/dashboard/events' },
    { label: 'Volunteer', value: eventVolunteerCount, max: 10, color: '#14B8A6', icon: '🙋', href: '/dashboard/events' },
    { label: 'Orders', value: orderStats.length, max: 50, color: '#EF4444', icon: '📦', href: '/orders' },
    { label: 'Earnings', value: Math.round(totalEarnings), max: 5000, color: '#F59E0B', icon: '💰', href: '' },
  ]

  const quickActions = [
    { label: 'New Project', icon: '🚀', href: '/plans' },
    { label: 'New Product', icon: '🛒', href: '/products/new' },
    { label: 'New Event', icon: '📅', href: '/events/new' },
    { label: 'Post Request', icon: '📝', href: '/requests' },
    { label: 'New Group', icon: '👥', href: '/groups/new' },
    { label: 'List Item', icon: '📦', href: '/products/new' },
    { label: 'Community', icon: '💬', href: '/community' },
    { label: 'Templates', icon: '📋', href: '/templates' },
    { label: 'Settings', icon: '⚙️', href: '/profile/settings' },
  ]

  return (
    <div className={styles.overview}>
      <div className={styles.welcomeHeader}>
        <h2>Welcome back, {session.user.name?.split(' ')[0] || 'User'}!</h2>
        <p>{allStats[6]} posts · {connectionCount} connections · {totalEarnings > 0 ? `$${totalEarnings.toFixed(0)} earned` : 'getting started'}</p>
      </div>

      <div className={styles.overviewStats}>
        {stats.map(stat => (
          stat.href ? (
            <Link key={stat.label} href={stat.href} className={styles.overviewStatCard}>
              <div className={styles.statGauge}>
                <StatGauge value={stat.value} max={stat.max} color={stat.color} size={48} />
              </div>
              <span className={styles.overviewStatLabel}>{stat.label}</span>
            </Link>
          ) : (
            <div key={stat.label} className={styles.overviewStatCard} style={{ cursor: 'default' }}>
              <div className={styles.statGauge}>
                <StatGauge value={stat.value} max={stat.max} color={stat.color} size={48} />
              </div>
              <span className={styles.overviewStatLabel}>{stat.label}</span>
            </div>
          )
        ))}
      </div>

      <div className={styles.quickActions}>
        <h3>Quick Actions</h3>
        <div className={styles.actionButtons}>
          {quickActions.map(a => (
            <Link key={a.label} href={a.href} className={styles.actionBtn}>
              <span>{a.icon}</span> {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.activityGrid}>
        <div className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <h3>Recent Projects</h3>
            <Link href="/dashboard/projects" className={styles.viewAll}>View all →</Link>
          </div>
          {plans.length > 0 ? (
            <div className={styles.activityList}>
              {plans.map(plan => (
                <Link key={plan.id} href={`/plans/${plan.id}`} className={styles.activityItem}>
                  <div className={styles.activityIcon}>🚀</div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>{plan.title}</span>
                    <span className={styles.activityMeta}>{plan.status} · {new Date(plan.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`badge badge-${plan.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{plan.status}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No projects yet</p>
              <Link href="/plans" className={styles.emptyAction}>Create your first project</Link>
            </div>
          )}
        </div>

        <div className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <h3>Your Feed</h3>
            <Link href="/dashboard/feed" className={styles.viewAll}>View all →</Link>
          </div>
          {recentFeedPosts.length > 0 ? (
            <div className={styles.feedCompact}>
              {recentFeedPosts.map(post => (
                <FeedItem key={post.id} post={{
                  id: post.id,
                  content: post.content,
                  images: post.images,
                  createdAt: post.createdAt.toISOString(),
                  user: post.user,
                  likes: 0,
                  sourceType: 'POST'
                }} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>No recent posts</p>
              <Link href="/dashboard/feed" className={styles.emptyAction}>Explore feed</Link>
            </div>
          )}
        </div>
      </div>

      {connectionFeed.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className={styles.activitySection}>
            <div className={styles.sectionHeader}>
              <h3>Activity from Connections</h3>
              <Link href="/community" className={styles.viewAll}>View all →</Link>
            </div>
            <div className={styles.activityList}>
              {connectionFeed.map(item => (
                <Link 
                  key={`${item.feedType}-${item.id}`} 
                  href={item.feedType === 'plan' ? `/plans/${item.id}` : `/products/${item.id}`} 
                  className={styles.activityItem}
                >
                  <div className={styles.activityIcon}>{item.feedType === 'plan' ? '🚀' : '🛒'}</div>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityTitle}>{item.title}</span>
                    <span className={styles.activityMeta}>by {item.userName || 'Unknown'} · {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {user && (user.walletAddress || user.paymentAddress || user.refundAddress || (user.acceptsDonations && user.donationAddress)) && (
        <div className={styles.walletCompact}>
          <h4>💳 Wallet</h4>
          {user.walletAddress && <code title={user.walletAddress}>{user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-4)}</code>}
          {user.paymentAddress && <code title={user.paymentAddress}>Pay: {user.paymentAddress.slice(0, 8)}...{user.paymentAddress.slice(-4)}</code>}
          {user.acceptsDonations && user.donationAddress && <code title={user.donationAddress}>Donate: {user.donationAddress.slice(0, 8)}...{user.donationAddress.slice(-4)}</code>}
          <Link href="/profile/edit" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Manage</Link>
        </div>
      )}

      {(!user?.shopSlug || !user?.schoolSlug) && (
        <div className={styles.promoGrid}>
          <div className={styles.promoCard}>
            <div className={styles.promoIcon}>📋</div>
            <h4>Business Templates</h4>
            <p>Pre-built templates for shops, schools, or courier services</p>
            <Link href="/templates" className={styles.promoBtn}>Browse</Link>
          </div>
          {!user?.shopSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏪</div>
              <h4>Start Selling</h4>
              <p>Create your shop and list products or services</p>
              <div>
                <Link href="/templates" className={styles.promoBtnSecondary}>Templates</Link>
                <Link href="/shop/setup" className={styles.promoBtn}>Setup Shop</Link>
              </div>
            </div>
          )}
          {!user?.schoolSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏫</div>
              <h4>Teach & Earn</h4>
              <p>Share knowledge and create educational content</p>
              <div>
                <Link href="/templates" className={styles.promoBtnSecondary}>Templates</Link>
                <Link href="/school/setup" className={styles.promoBtn}>Create School</Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
