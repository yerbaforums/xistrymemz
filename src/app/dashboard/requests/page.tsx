import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from '../page.module.css'

export const dynamic = 'force-dynamic'

export default async function DashboardRequests() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const requests = await prisma.request.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: { select: { id: true, title: true } },
      group: { select: { id: true, name: true } },
      product: { select: { id: true, title: true } },
      event: { select: { id: true, title: true } },
      _count: { select: { comments: true } }
    }
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Requests</h1>
          <p className={styles.welcome}>Create and manage your requests</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/requests/public" className="btn-secondary">Browse Public</Link>
          <Link href="/requests" className="btn-primary">+ New Request</Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className={styles.empty}>
          <p>No requests yet. Create your first request!</p>
          <Link href="/requests" className="btn-primary">Create Request</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {requests.map(req => {
            const linkLabel = req.plan?.title || req.group?.name || req.product?.title || req.event?.title || 'Standalone'
            return (
              <Link key={req.id} href={`/requests/${req.id}`} className={styles.item}>
                <div className={styles.itemMain}>
                  <h3>{req.title}</h3>
                  <p>{req.description || 'No description'}</p>
                  <span className={styles.linkBadge}>{linkLabel}</span>
                </div>
                <div className={styles.itemMeta}>
                  <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                  <span className={`badge badge-${req.priority.toLowerCase()}`}>{req.priority}</span>
                  <span>{req._count.comments} comments</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}