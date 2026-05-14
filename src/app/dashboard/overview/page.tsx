import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import FeedItem from '@/components/FeedItem'
import styles from '../page.module.css'

export const dynamic = 'force-dynamic'

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
      take: 10
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
    select: { shopSlug: true, schoolSlug: true, walletAddress: true, paymentAddress: true, refundAddress: true, cryptoCurrency: true, donationAddress: true, donationCurrency: true, acceptsDonations: true }
  })

  const allStats = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.request.count({ where: { userId } }),
    prisma.product.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.eventJoiner.count({ where: { userId } }),
    prisma.schoolContent.count({ where: { userId } }),
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

  return (
    <div className={styles.overview}>
      <div className={styles.welcomeHeader}>
        <h2>Welcome back, {session.user.name?.split(' ')[0] || 'User'}!</h2>
        <p>Here&apos;s what&apos;s happening with your activity</p>
      </div>
      
      <div className={styles.statsGrid}>
        <Link href="/dashboard/projects" className={styles.statCard}>
          <span className={styles.statIcon}>🚀</span>
          <span className={styles.statValue}>{allStats[0]}</span>
          <span className={styles.statLabel}>Projects</span>
        </Link>
        <Link href="/dashboard/requests" className={styles.statCard}>
          <span className={styles.statIcon}>📝</span>
          <span className={styles.statValue}>{pendingRequests}</span>
          <span className={styles.statLabel}>Requests</span>
        </Link>
        <Link href="/dashboard/marketplace" className={styles.statCard}>
          <span className={styles.statIcon}>🛒</span>
          <span className={styles.statValue}>{allStats[2]}</span>
          <span className={styles.statLabel}>Products</span>
        </Link>
        <Link href="/dashboard/rentals" className={styles.statCard}>
          <span className={styles.statIcon}>🏠</span>
          <span className={styles.statValue}>{rentalCount}</span>
          <span className={styles.statLabel}>Rentals</span>
        </Link>
        <Link href="/dashboard/teaching" className={styles.statCard}>
          <span className={styles.statIcon}>🏫</span>
          <span className={styles.statValue}>{allStats[5]}</span>
          <span className={styles.statLabel}>Teachings</span>
        </Link>
        <Link href="/dashboard/offers" className={styles.statCard}>
          <span className={styles.statIcon}>🤝</span>
          <span className={styles.statValue}>{offersReceived}</span>
          <span className={styles.statLabel}>Offers In</span>
        </Link>
        <Link href="/dashboard/offers" className={styles.statCard}>
          <span className={styles.statIcon}>📤</span>
          <span className={styles.statValue}>{offersSent}</span>
          <span className={styles.statLabel}>Offers Out</span>
        </Link>
        <Link href="/community" className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statValue}>{connectionCount}</span>
          <span className={styles.statLabel}>Connections</span>
        </Link>
        <Link href="/community/groups" className={styles.statCard}>
          <span className={styles.statIcon}>🏠</span>
          <span className={styles.statValue}>{allStats[3]}</span>
          <span className={styles.statLabel}>Groups</span>
        </Link>
        <Link href="/dashboard/events" className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <span className={styles.statValue}>{eventAttendeeCount}</span>
          <span className={styles.statLabel}>Events</span>
        </Link>
        <Link href="/dashboard/events" className={styles.statCard}>
          <span className={styles.statIcon}>🙋</span>
          <span className={styles.statValue}>{eventVolunteerCount}</span>
          <span className={styles.statLabel}>Volunteer</span>
        </Link>
        <Link href="/orders" className={styles.statCard}>
          <span className={styles.statIcon}>📦</span>
          <span className={styles.statValue}>{orderStats.length}</span>
          <span className={styles.statLabel}>Orders</span>
        </Link>
        <div className={styles.statCard} style={{ cursor: 'default' }}>
          <span className={styles.statIcon}>💰</span>
          <span className={styles.statValue}>${totalEarnings.toFixed(2)}</span>
          <span className={styles.statLabel}>Earnings</span>
        </div>
      </div>

        <div className={styles.quickActions}>
          <h3>Quick Actions</h3>
          <div className={styles.actionButtons}>
            <Link href="/templates" className={styles.actionBtn}>
              <span>📋</span> Browse Templates
            </Link>
            <Link href="/products/new" className={styles.actionBtn}>
              <span>🛒</span> New Product
            </Link>
            <Link href="/plans" className={styles.actionBtn}>
              <span>🚀</span> New Project
            </Link>
            <Link href="/requests" className={styles.actionBtn}>
              <span>📝</span> Post Request
            </Link>
            <Link href="/groups/new" className={styles.actionBtn}>
              <span>👥</span> New Group
            </Link>
            <Link href="/events/new" className={styles.actionBtn}>
              <span>📅</span> New Event
            </Link>
            <Link href="/products/new" className={styles.actionBtn}>
              <span>📦</span> List Item
            </Link>
            <Link href="/school/setup" className={styles.actionBtn}>
              <span>🏫</span> Create Course
            </Link>
            <Link href="/community" className={styles.actionBtn}>
              <span>💬</span> Community
            </Link>
            <Link href="/profile/settings" className={styles.actionBtn}>
              <span>⚙️</span> Profile Settings
            </Link>
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
                    <span className={styles.activityMeta}>{plan.status} • {new Date(plan.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`badge badge-${plan.status.toLowerCase()}`}>{plan.status}</span>
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

        {connectionFeed.length > 0 && (
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
                    <span className={styles.activityMeta}>by {item.userName || 'Unknown'} • {new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {recentFeedPosts.length > 0 && (
        <div className={styles.activityGrid} style={{ marginTop: '32px' }}>
          <div className={styles.activitySection} style={{ gridColumn: '1 / -1' }}>
            <div className={styles.sectionHeader}>
              <h3>Your Feed</h3>
              <Link href="/dashboard/feed" className={styles.viewAll}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentFeedPosts.map(post => (
                <FeedItem key={post.id} post={{
                  id: post.id,
                  content: post.content,
                  images: post.images,
                  createdAt: post.createdAt.toISOString(),
                  user: post.user,
                  sourceType: 'POST'
                }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Wallet Addresses */}
      {user && (user.walletAddress || user.paymentAddress || user.refundAddress || (user.acceptsDonations && user.donationAddress)) && (
        <div className={styles.promoGrid}>
          <div className={styles.promoCard} style={{gridColumn: '1 / -1'}}>
            <div className={styles.promoIcon}>💳</div>
            <h4>My Wallet Addresses</h4>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px'}}>
              {user.walletAddress && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'}}>
                  <img src={`/crypto-logos/${user.cryptoCurrency?.toLowerCase() || 'ethereum'}.png`} alt="" width={20} height={20} style={{borderRadius: '50%'}} />
                  <span style={{color: 'var(--text-secondary)', minWidth: '120px'}}>Wallet:</span>
                  <code style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px'}}>{user.walletAddress}</code>
                </div>
              )}
              {user.paymentAddress && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'}}>
                  <img src={`/crypto-logos/${user.cryptoCurrency?.toLowerCase() || 'ethereum'}.png`} alt="" width={20} height={20} style={{borderRadius: '50%'}} />
                  <span style={{color: 'var(--text-secondary)', minWidth: '120px'}}>Payment:</span>
                  <code style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px'}}>{user.paymentAddress}</code>
                </div>
              )}
              {user.refundAddress && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'}}>
                  <img src={`/crypto-logos/${user.cryptoCurrency?.toLowerCase() || 'ethereum'}.png`} alt="" width={20} height={20} style={{borderRadius: '50%'}} />
                  <span style={{color: 'var(--text-secondary)', minWidth: '120px'}}>Refund:</span>
                  <code style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px'}}>{user.refundAddress}</code>
                </div>
              )}
              {user.acceptsDonations && user.donationAddress && (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem'}}>
                  <img src={`/crypto-logos/${user.donationCurrency?.toLowerCase() || 'ethereum'}.png`} alt="" width={20} height={20} style={{borderRadius: '50%'}} />
                  <span style={{color: 'var(--text-secondary)', minWidth: '120px'}}>Donation:</span>
                  <code style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px'}}>{user.donationAddress}</code>
                </div>
              )}
            </div>
            <Link href="/profile/edit" className={styles.promoBtn} style={{marginTop: '12px'}}>Manage Addresses</Link>
          </div>
        </div>
      )}

      {(!user?.shopSlug || !user?.schoolSlug) && (
        <div className={styles.promoGrid}>
          <div className={styles.promoCard}>
            <div className={styles.promoIcon}>📋</div>
            <h4>Business Templates</h4>
            <p>Start with pre-built templates for shops, schools, or courier services</p>
            <Link href="/templates" className={styles.promoBtn}>Browse All Templates</Link>
          </div>
          {!user?.shopSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏪</div>
              <h4>Start Selling</h4>
              <p>Create your shop and start listing products or services</p>
              <Link href="/templates" className={styles.promoBtnSecondary}>Browse Templates</Link>
              <Link href="/shop/setup" className={styles.promoBtn}>Setup Shop</Link>
            </div>
          )}
          {!user?.schoolSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏫</div>
              <h4>Teach & Earn</h4>
              <p>Share your knowledge and create educational content</p>
              <Link href="/templates" className={styles.promoBtnSecondary}>Browse Templates</Link>
              <Link href="/school/setup" className={styles.promoBtn}>Create School</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}