import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import Breadcrumbs from '@/components/Breadcrumbs'
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
    orderStats
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
    })
  ])

  // Used for display purposes - satisfy linter by using
  void products
  void groupMemberships

  const connectedUserIds = connectionActivity.map(c => 
    c.requesterId === userId ? c.receiverId : c.requesterId
  )

  const [recentPlans, recentProducts] = await Promise.all([
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
    })
  ])

  const connectionFeed = [
    ...recentPlans.map(p => ({ feedType: 'plan' as const, id: p.id, title: p.title, status: p.status, createdAt: p.createdAt, userName: p.user.name })),
    ...recentProducts.map(p => ({ feedType: 'product' as const, id: p.id, title: p.title, type: p.type, createdAt: p.createdAt, userName: p.user.name }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { shopSlug: true, schoolSlug: true }
  })

  const allStats = await Promise.all([
    prisma.plan.count({ where: { userId } }),
    prisma.request.count({ where: { userId } }),
    prisma.product.count({ where: { userId } }),
    prisma.groupMember.count({ where: { userId } }),
    prisma.eventJoiner.count({ where: { userId } }),
    prisma.schoolContent.count({ where: { userId } }),
  ])

  const plans = _plans
  const requests = _requests

  // Use these to satisfy linter
  void products
  void groupMemberships
  
  const pendingRequests = requests.filter((r: { status: string }) => r.status === 'PENDING').length

  return (
    <div className={styles.overview}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Overview' }
      ]} />
      
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
          <span className={styles.statLabel}>Pending Requests</span>
        </Link>
        <Link href="/dashboard/marketplace" className={styles.statCard}>
          <span className={styles.statIcon}>🛒</span>
          <span className={styles.statValue}>{allStats[2]}</span>
          <span className={styles.statLabel}>Products</span>
        </Link>
        <Link href="/community" className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statValue}>{connectionCount}</span>
          <span className={styles.statLabel}>Connections</span>
        </Link>
        <Link href="/community/groups" className={styles.statCard}>
          <span className={styles.statIcon}>👥</span>
          <span className={styles.statValue}>{allStats[3]}</span>
          <span className={styles.statLabel}>Groups</span>
        </Link>
        <Link href="/dashboard/events" className={styles.statCard}>
          <span className={styles.statIcon}>📅</span>
          <span className={styles.statValue}>{allStats[4]}</span>
          <span className={styles.statLabel}>Events</span>
        </Link>
        <Link href="/wallet" className={styles.statCard}>
          <span className={styles.statIcon}>💳</span>
          <span className={styles.statValue}>Wallet</span>
          <span className={styles.statLabel}>View Balance</span>
        </Link>
        <Link href="/orders" className={styles.statCard}>
          <span className={styles.statIcon}>📦</span>
          <span className={styles.statValue}>{orderStats.length}</span>
          <span className={styles.statLabel}>Orders</span>
        </Link>
      </div>

      <div className={styles.quickActions}>
        <h3>Quick Actions</h3>
        <div className={styles.actionButtons}>
          <Link href="/plans/new" className={styles.actionBtn}>
            <span>🚀</span> New Project
          </Link>
          <Link href="/requests" className={styles.actionBtn}>
            <span>📝</span> Post Request
          </Link>
          <Link href="/products" className={styles.actionBtn}>
            <span>🛒</span> List Product
          </Link>
          <Link href="/community/groups" className={styles.actionBtn}>
            <span>👥</span> Browse Groups
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
              <Link href="/plans/new" className={styles.emptyAction}>Create your first project</Link>
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

      {(!user?.shopSlug || !user?.schoolSlug) && (
        <div className={styles.promoGrid}>
          {!user?.shopSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏪</div>
              <h4>Start Selling</h4>
              <p>Create your shop and start listing products or services</p>
              <Link href="/shop/setup" className={styles.promoBtn}>Setup Shop</Link>
            </div>
          )}
          {!user?.schoolSlug && (
            <div className={styles.promoCard}>
              <div className={styles.promoIcon}>🏫</div>
              <h4>Teach & Earn</h4>
              <p>Share your knowledge and create educational content</p>
              <Link href="/school/setup" className={styles.promoBtn}>Create School</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}