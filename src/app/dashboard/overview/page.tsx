import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import FeedItem from '@/components/FeedItem'
import DashboardTodo from '@/components/DashboardTodo'
import { getClassGuides } from '@/lib/classOnboarding'
import type { ClassSetupStep } from '@/lib/classOnboarding'
import styles from '../page.module.css'
import overviewStyles from './OverviewCards.module.css'
import TipCard from './TipCard'
import ChecklistCard from './ChecklistCard'
import FeatureBanner from './FeatureBanner'
import StreakCard from './StreakCard'
import AchievementCard from './AchievementCard'

export const dynamic = 'force-dynamic'

function StatGauge({ value, max = 100, size = 80, color = 'var(--accent-primary)', icon = '📊' }: { value: number; max?: number; size?: number; color?: string; icon?: string }) {
  const pct = Math.min(Math.max(value / max, 0), 1)
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c - pct * c
  const fontSize = value >= 1000 ? 11 : value >= 100 ? 14 : 17

  return (
    <svg viewBox="0 0 80 80" width={size} height={size}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="5" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x="40" y="26" textAnchor="middle" dominantBaseline="central"
        fontSize="16">{icon}</text>
      <text x="40" y="49" textAnchor="middle" dominantBaseline="central"
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

  const t = await getTranslations('dashboard')
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
    select: { name: true, bio: true, shopSlug: true, schoolSlug: true, onboardingCompleted: true, setupProgress: true, walletAddress: true, paymentAddress: true, refundAddress: true, cryptoCurrency: true, donationAddress: true, donationCurrency: true, acceptsDonations: true, userClass: true }
  })

  const userClasses = (user?.userClass || '').split(',').map(c => c.trim()).filter(Boolean)
  const guides = getClassGuides(userClasses)
  const allSteps = guides.flatMap(g => g.steps)

  const [serviceCount, eventCount] = await Promise.all([
    prisma.serviceOffering.count({ where: { userId } }),
    prisma.event.count({ where: { organizerId: userId } }),
  ])

  const productTypeCounts: Record<string, number> = {}
  for (const p of products) {
    productTypeCounts[p.type] = (productTypeCounts[p.type] || 0) + 1
  }

  const featureCounts = {
    product: (productTypeCounts['PRODUCT'] || 0),
    rental: (productTypeCounts['RENTAL'] || 0),
    service: serviceCount,
    event: eventCount,
    shop: user?.shopSlug ? 1 : 0,
    school: user?.schoolSlug ? 1 : 0,
  }

  const incompleteSteps = allSteps.filter(step => featureCounts[step.feature] === 0)

  const allStats = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.request.count({ where: { userId } }),
    prisma.product.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.eventJoiner.count({ where: { userId } }),
    prisma.schoolContent.count({ where: { userId } }),
    prisma.post.count({ where: { userId } }),
  ])

  // Analytics: total views across all content
  const [postViews, productViews, serviceViews, requestViews] = await Promise.all([
    prisma.post.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    prisma.product.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    prisma.serviceOffering.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    prisma.request.aggregate({ where: { userId }, _sum: { viewCount: true } }),
  ])

  const totalViews = (postViews._sum.viewCount ?? 0) + (productViews._sum.viewCount ?? 0) + (serviceViews._sum.viewCount ?? 0) + (requestViews._sum.viewCount ?? 0)
  const totalListings = allStats[2] + serviceCount + rentalCount

  const [offersSent, offersReceived] = await Promise.all([
    prisma.barterOffer.count({ where: { makerId: userId } }),
    prisma.barterOffer.count({ where: { receiverId: userId } }),
  ])

  const [trendingPlans, recentListings] = await Promise.all([
    prisma.plan.findMany({
      where: { published: true, status: { not: 'ARCHIVED' } },
      select: { id: true, title: true, user: { select: { name: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 4
    }),
    prisma.product.findMany({
      where: { published: true },
      select: { id: true, title: true, price: true, user: { select: { name: true, shopSlug: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 4
    }),
  ])

  const plans = _plans
  const requests = _requests

  void products
  void groupMemberships
  
  const pendingRequests = requests.filter((r: { status: string }) => r.status === 'PENDING').length
  const eventAttendeeCount = eventJoinerCounts.find(r => r.role === 'ATTENDEE')?._count ?? 0
  const eventVolunteerCount = eventJoinerCounts.find(r => r.role === 'VOLUNTEER')?._count ?? 0
  const totalEarnings = (sellerEarnings._sum.netAmount ?? 0) + (teachingEarnings._sum.amount ?? 0)
  const isNewUser = allStats[6] === 0 && plans.length === 0 && allStats[2] === 0 && connectionCount === 0

  const stats: StatDef[] = [
    { label: t('projects'), value: allStats[0], max: 20, color: '#8B5CF6', icon: '🚀', href: '/dashboard/projects' },
    { label: t('requests'), value: pendingRequests, max: 20, color: '#F59E0B', icon: '📝', href: '/dashboard/requests' },
    { label: t('products'), value: allStats[2], max: 50, color: '#10B981', icon: '🛒', href: '/dashboard/marketplace' },
    { label: t('services'), value: serviceCount, max: 20, color: '#14B8A6', icon: '🔧', href: '/dashboard/services' },
    { label: t('rentals'), value: rentalCount, max: 20, color: '#3B82F6', icon: '🏠', href: '/dashboard/rentals' },
    { label: t('teaching'), value: allStats[5], max: 20, color: '#EC4899', icon: '🏫', href: '/dashboard/teaching' },
    { label: t('offers'), value: offersReceived, max: 20, color: '#F97316', icon: '🤝', href: '/dashboard/offers' },
    { label: t('offers'), value: offersSent, max: 20, color: '#FB923C', icon: '📤', href: '/dashboard/offers' },
    { label: t('events'), value: eventAttendeeCount, max: 20, color: '#6366F1', icon: '📅', href: '/dashboard/events' },
    { label: t('orders'), value: orderStats.length, max: 50, color: '#EF4444', icon: '📦', href: '/orders' },
    { label: 'Connections', value: connectionCount, max: 100, color: '#06B6D4', icon: '👥', href: '/community' },
    { label: 'Groups', value: allStats[3], max: 20, color: '#84CC16', icon: '🏠', href: '/community/groups' },
    { label: 'Volunteer', value: eventVolunteerCount, max: 10, color: '#14B8A6', icon: '🙋', href: '/dashboard/events' },
    { label: 'Earnings', value: Math.round(totalEarnings), max: 5000, color: '#F59E0B', icon: '💰', href: '' },
    { label: 'Total Views', value: totalViews, max: Math.max(totalViews, 100), color: '#06B6D4', icon: '👁️', href: '' },
    { label: 'Listings', value: totalListings, max: Math.max(totalListings, 20), color: '#84CC16', icon: '📋', href: '/dashboard/marketplace' },
  ]

  const quickActions = [
    { label: 'New Project', icon: '🚀', href: '/dashboard/projects' },
    { label: 'New Product', icon: '🛒', href: '/products/new' },
    { label: 'New Service', icon: '🔧', href: '/dashboard/services' },
    { label: 'New Event', icon: '📅', href: '/events/new' },
    { label: t('requests'), icon: '📝', href: '/requests' },
    { label: 'New Group', icon: '👥', href: '/groups/new' },
    { label: t('videoChat'), icon: '📹', href: '/dashboard/video' },
    { label: t('planner'), icon: '🗓️', href: '/dashboard/appointments' },
    { label: 'Community', icon: '💬', href: '/community' },
    { label: t('settings'), icon: '⚙️', href: '/profile/settings' },
  ]

  const coreQuickActions = quickActions.slice(0, 6)

  return (
    <div className={styles.overview}>
      <div className={styles.welcomeHeader}>
        <h2>Welcome back, {session.user.name?.split(' ')[0] || 'User'}! 👋</h2>
        <p>{isNewUser ? 'Let&apos;s get started — here are your first steps.' : `${allStats[6]} posts · ${connectionCount} connections${totalViews > 0 ? ` · ${totalViews} views` : ''}${totalEarnings > 0 ? ` · $${totalEarnings.toFixed(0)} earned` : ''}`}</p>
      </div>

      {/* New user: simplified view with prioritized next step */}
      {isNewUser ? (
        <>
          <div className={styles.firstVisitBanner}>
            <div className={styles.firstVisitIcon}>👋</div>
            <div className={styles.firstVisitContent}>
              <h3>{t('title')}</h3>
              <p>This is your command center. Start by completing your profile and joining the community:</p>
              <div className={styles.firstVisitLinks}>
                <Link href="/profile/edit" className={styles.firstVisitLink}>⚙️ Complete Profile</Link>
                <Link href={userClasses.length > 0 ? `/onboarding` : `/onboarding`} className={styles.firstVisitLink}>🚀 Set Up Your Class</Link>
                <Link href="/dashboard/feed#feed-post-form" className={styles.firstVisitLink}>✏️ Write Your First Post</Link>
                <Link href="/products/new" className={styles.firstVisitLink}>🛒 List a Product</Link>
                <Link href="/community" className={styles.firstVisitLink}>👥 Find People</Link>
              </div>
            </div>
          </div>
          <ChecklistCard
            hasName={!!user?.name}
            hasBio={!!user?.bio}
            postCount={allStats[6]}
            productCount={allStats[2]}
            groupCount={allStats[3]}
            connectionCount={connectionCount}
            hasShop={!!user?.shopSlug}
            hasSchool={!!user?.schoolSlug}
          />
          <div className={styles.quickActions}>
            <h3>Quick Actions</h3>
            <div className={styles.actionButtons}>
              {coreQuickActions.map(a => (
                <Link key={a.label} href={a.href} className={styles.actionBtn}>
                  <span>{a.icon}</span> {a.label}
                </Link>
              ))}
            </div>
          </div>
          <DashboardTodo />
        </>
      ) : (
        <>
          {/* Active user: full dashboard */}
          <FeatureBanner />
          <TipCard />

          <div className={styles.overviewStats}>
            {stats.map(stat => (
              stat.href ? (
                <Link key={stat.label} href={stat.href} className={styles.overviewStatCard}>
                  <div className={styles.statGauge}>
                    <StatGauge value={stat.value} max={stat.max} color={stat.color} icon={stat.icon} size={80} />
                  </div>
                  <span className={styles.overviewStatLabel}>{stat.label}</span>
                </Link>
              ) : (
                <div key={stat.label} className={styles.overviewStatCard} style={{ cursor: 'default' }}>
                  <div className={styles.statGauge}>
                    <StatGauge value={stat.value} max={stat.max} color={stat.color} icon={stat.icon} size={80} />
                  </div>
                  <span className={styles.overviewStatLabel}>{stat.label}</span>
                </div>
              )
            ))}
          </div>

          <div className={styles.quickActions}>
            <h3>Quick Actions</h3>
            <div className={styles.actionButtons}>
              {coreQuickActions.map(a => (
                <Link key={a.label} href={a.href} className={styles.actionBtn}>
                  <span>{a.icon}</span> {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.activityGrid}>
            <div className={styles.activitySection}>
              <div className={styles.sectionHeader}>
                <h3>📦 {t('projects')}</h3>
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
                  <Link href="/dashboard/projects" className={styles.emptyAction}>Create your first project</Link>
                </div>
              )}
            </div>

            <div className={styles.activitySection}>
              <div className={styles.sectionHeader}>
                <h3>📡 {t('feed')}</h3>
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

          <details className={styles.collapsibleSection}>
            <summary className={styles.collapsibleSummary}>📊 More Stats &amp; Tools</summary>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
              <ChecklistCard
                hasName={!!user?.name}
                hasBio={!!user?.bio}
                postCount={allStats[6]}
                productCount={allStats[2]}
                groupCount={allStats[3]}
                connectionCount={connectionCount}
                hasShop={!!user?.shopSlug}
                hasSchool={!!user?.schoolSlug}
              />
              <AchievementCard
                postCount={allStats[6]}
                connectionCount={connectionCount}
                productCount={allStats[2]}
                planCount={allStats[0]}
                groupCount={allStats[3]}
                hasShop={!!user?.shopSlug}
                hasSchool={!!user?.schoolSlug}
              />
            </div>

            <div className={styles.discoverSection} style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>🌍 Discover</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/plans/public" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>🚀</span> Browse Projects
                </Link>
                <Link href="/products" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>🛒</span> {t('marketplace')}
                </Link>
                <Link href="/services" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>🔧</span> {t('services')}
                </Link>
                <Link href="/hashtags" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>#</span> Trending Tags
                </Link>
                <Link href="/community" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>👥</span> Find Members
                </Link>
                <Link href="/community/groups" className={styles.actionBtn} style={{ flex: 1, minWidth: 140 }}>
                  <span>🏠</span> Explore Groups
                </Link>
              </div>
            </div>

            {connectionFeed.length > 0 && (
              <div className={styles.activitySection} style={{ marginTop: 16 }}>
                <div className={styles.sectionHeader}>
                  <h3>🤝 Activity from Connections</h3>
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
            )}

            <StreakCard postCount={allStats[6]} connectionCount={connectionCount} />

            {user && (user.walletAddress || user.paymentAddress || user.refundAddress || (user.acceptsDonations && user.donationAddress)) && (
              <div className={styles.walletCompact} style={{ marginTop: 16 }}>
                <h4>💳 {t('wallet')}</h4>
                {user.walletAddress && <code title={user.walletAddress}>{user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-4)}</code>}
                {user.paymentAddress && <code title={user.paymentAddress}>Pay: {user.paymentAddress.slice(0, 8)}...{user.paymentAddress.slice(-4)}</code>}
                {user.acceptsDonations && user.donationAddress && <code title={user.donationAddress}>Donate: {user.donationAddress.slice(0, 8)}...{user.donationAddress.slice(-4)}</code>}
                <Link href="/profile/edit" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>Manage</Link>
              </div>
            )}
          </details>

          <DashboardTodo />
        </>
      )}
    </div>
  )
}
