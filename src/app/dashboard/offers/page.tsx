import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from '../page.module.css'

export const dynamic = 'force-dynamic'

export default async function DashboardOffers() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const [sentOffers, receivedOffers, offerStats] = await Promise.all([
    prisma.barterOffer.findMany({
      where: { makerId: userId },
      include: {
        receiver: { select: { id: true, name: true, location: true, image: true } },
        _count: { select: { counterOffers: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.barterOffer.findMany({
      where: { receiverId: userId },
      include: {
        maker: { select: { id: true, name: true, location: true, image: true } },
        _count: { select: { counterOffers: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    prisma.barterOffer.groupBy({
      by: ['status'],
      where: { OR: [{ makerId: userId }, { receiverId: userId }] },
      _count: true
    })
  ])

  const statsMap = Object.fromEntries(
    offerStats.map(s => [s.status, s._count])
  )

  const pendingCount = (sentOffers.filter(o => o.status === 'PENDING').length) + (receivedOffers.filter(o => o.status === 'PENDING').length)
  const acceptedCount = (sentOffers.filter(o => o.status === 'ACCEPTED').length) + (receivedOffers.filter(o => o.status === 'ACCEPTED').length)
  const counteredCount = (sentOffers.filter(o => o.status === 'COUNTERED').length) + (receivedOffers.filter(o => o.status === 'COUNTERED').length)

  return (
    <div className={styles.container}>
      <h1>🤝 Barter Offers</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{pendingCount}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{acceptedCount}</span>
          <span className={styles.statLabel}>Accepted</span>
        </div>
        {counteredCount > 0 && (
          <div className={styles.statCard}>
            <span className={styles.statValue} style={{ color: '#a6e' }}>{counteredCount}</span>
            <span className={styles.statLabel}>Countered</span>
          </div>
        )}
        <div className={styles.statCard}>
          <span className={styles.statValue}>{sentOffers.length}</span>
          <span className={styles.statLabel}>Sent</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{receivedOffers.length}</span>
          <span className={styles.statLabel}>Received</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Sent Offers</h2>
        {sentOffers.length === 0 ? (
          <div className={styles.emptyLarge}>
            <div className={styles.emptyIcon}>📤</div>
            <h3>No offers sent yet</h3>
            <p>Browse the marketplace to find items you&apos;d like to trade for.</p>
            <Link href="/products" className={styles.emptyBtn}>Browse Marketplace</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {sentOffers.map(offer => (
              <Link 
                key={offer.id} 
                href={`/offers/${offer.id}`}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{offer.listingTitle}</span>
                  <span className={styles.itemMeta}>
                    {offer.listingType} • You offered: {offer.offeredItem}
                    {offer._count.counterOffers > 0 && (
                      <span className={styles.counterBadge}>
                        ↩ {offer._count.counterOffers} counter{offer._count.counterOffers > 1 ? 's' : ''}
                      </span>
                    )}
                  </span>
                </div>
                <span className={`${styles.itemStatus} ${styles[offer.status.toLowerCase()]}`}>
                  {offer.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Received Offers</h2>
        {receivedOffers.length === 0 ? (
          <div className={styles.emptyLarge}>
            <div className={styles.emptyIcon}>📥</div>
            <h3>No offers received yet</h3>
            <p>Offers from other members will appear here when someone wants to trade with you.</p>
            <Link href="/products" className={styles.emptyBtn}>Browse Marketplace</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {receivedOffers.map(offer => (
              <Link 
                key={offer.id} 
                href={`/offers/${offer.id}`}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <span className={styles.itemTitle}>{offer.listingTitle}</span>
                  <span className={styles.itemMeta}>
                    {offer.listingType} • They offered: {offer.offeredItem}
                  </span>
                </div>
                <span className={`${styles.itemStatus} ${styles[offer.status.toLowerCase()]}`}>
                  {offer.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
