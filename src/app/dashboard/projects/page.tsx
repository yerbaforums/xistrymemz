import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from '../page.module.css'

export const dynamic = 'force-dynamic'

export default async function DashboardProjects() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const userId = session.user.id

  const plans = await prisma.plan.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { requests: true, joiners: true } }
    }
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Projects</h1>
          <p className={styles.welcome}>Manage your projects and collaborations</p>
        </div>
        <Link href="/plans/new" className="btn-primary">+ New Project</Link>
      </div>

      {plans.length === 0 ? (
        <div className={styles.empty}>
          <p>No projects yet. Create your first project!</p>
          <Link href="/plans/new" className="btn-primary">Create Project</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {plans.map(plan => (
            <Link key={plan.id} href={`/plans/${plan.id}`} className={styles.item}>
              <div className={styles.itemMain}>
                <h3>{plan.title}</h3>
                <p>{plan.description || 'No description'}</p>
              </div>
              <div className={styles.itemMeta}>
                <span className={`badge badge-${plan.status.toLowerCase()}`}>{plan.status}</span>
                <span>{plan._count.requests} requests</span>
                <span>{plan._count.joiners} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}