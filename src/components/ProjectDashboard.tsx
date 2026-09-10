import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import styles from './ProjectDashboard.module.css'

interface ProjectDashboardProps {
  projectId: string
}

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-draft',
  IDEA: 'badge-idea',
  ACTIVE: 'badge-active',
  IN_PROGRESS: 'badge-in_progress',
  COMPLETED: 'badge-completed',
  ARCHIVED: 'badge-archived',
}

export default async function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [project, updates, contributions, issues] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        status: true,
        mileposts: true,
        milepostStatus: true,
        goalAmount: true,
        currentFunding: true,
        _count: { select: { joiners: true, contributions: true, updates: true, requests: true } },
      },
    }),
    prisma.projectUpdate.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, content: true, createdAt: true, user: { select: { name: true, username: true } } },
    }),
    prisma.projectContribution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, amount: true, message: true, createdAt: true, user: { select: { name: true, username: true } } },
    }),
    prisma.request.findMany({
      where: { projectId },
      select: { id: true, title: true, status: true, goalAmount: true, currentFunding: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!project) return null

  const totalFunding = project.goalAmount || 0
  const currentFunding = project.currentFunding || 0
  const progressPct = totalFunding > 0 ? Math.min(Math.round((currentFunding / totalFunding) * 100), 100) : 0

  const statusCounts: Record<string, number> = {}
  for (const r of issues) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1

  const activity = [
    ...updates.map(u => ({ id: `u-${u.id}`, type: 'update', createdAt: u.createdAt.toISOString(), text: u.content, name: u.user.name || u.user.username || 'Unknown' })),
    ...contributions.map(c => ({ id: `c-${c.id}`, type: 'contribution', createdAt: c.createdAt.toISOString(), text: `${c.message ? c.message + ' ' : ''}($${c.amount})`, name: c.user.name || c.user.username || 'Unknown' })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div className={styles.dashboard}>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{project._count.joiners}</span>
          <span className={styles.statLabel}>Joiners</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>${currentFunding}</span>
          <span className={styles.statLabel}>Contributions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{project._count.updates}</span>
          <span className={styles.statLabel}>Updates</span>
        </div>
        <div className={styles.stat}>
          <span className={`badge ${STATUS_BADGE[project.status] || 'badge-idea'}`}>{project.status}</span>
          <span className={styles.statLabel}>Status</span>
        </div>
      </div>

      {totalFunding > 0 && (
        <div className={styles.fundingBar}>
          <div className={styles.fundingTrack}>
            <div className={styles.fundingFill} style={{ width: `${progressPct}%` }} />
          </div>
          <span className={styles.fundingText}>{progressPct}% funded</span>
        </div>
      )}

      <div className={styles.columns}>
        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Recent Activity</h4>
          {activity.length === 0 ? (
            <p className={styles.empty}>No recent activity</p>
          ) : (
            <ul className={styles.activityList}>
              {activity.map(a => (
                <li key={a.id} className={styles.activityItem}>
                  <span className={styles.activityType}>{a.type === 'update' ? '📝' : '💰'}</span>
                  <div className={styles.activityBody}>
                    <span className={styles.activityText}>{a.text}</span>
                    <span className={styles.activityMeta}>{a.name} · {new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Quick Actions</h4>
          <div className={styles.actions}>
            <Link href={`/projects/${projectId}/updates/new`} className={styles.action}>+ Add Update</Link>
            <Link href={`/projects/${projectId}/edit`} className={styles.action}>✏️ Edit Project</Link>
            <Link href={`/projects/${projectId}/collaborators`} className={styles.action}>🤝 Invite Collaborator</Link>
          </div>
        </div>

        <div className={styles.column}>
          <h4 className={styles.columnTitle}>Linked Requests ({issues.length})</h4>
          {issues.length === 0 ? (
            <p className={styles.empty}>No linked requests</p>
          ) : (
            <ul className={styles.requestList}>
              {issues.map(r => (
                <li key={r.id} className={styles.requestRow}>
                  <Link href={`/requests/${r.id}`} className={styles.requestLink}>{r.title}</Link>
                  <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
          {Object.keys(statusCounts).length > 0 && (
            <div className={styles.statusSummary}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <span key={status} className={styles.statusChip}>{status}: {count}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
