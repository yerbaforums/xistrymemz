'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface ReportEntry {
  id: string
  entityType: string
  entityId: string
  reason: string
  description?: string | null
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  reporter?: { id: string; name?: string | null; username?: string | null } | null
}

const REASON_LABELS: Record<string, string> = {
  SPAM: 'Spam',
  ABUSE: 'Abuse',
  HARASSMENT: 'Harassment',
  INAPPROPRIATE: 'Inappropriate',
  OTHER: 'Other',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  REVIEWING: 'Reviewing',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  FORUMPOST: 'Forum Post',
  FORUMREPLY: 'Forum Reply',
  POST: 'Post',
  PRODUCT: 'Product',
  SERVICE: 'Service',
  EVENT: 'Event',
  PLAN: 'Project',
  REQUEST: 'Request',
  GROUP: 'Group',
  USER: 'User',
}

export default function AdminReportsPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [entries, setEntries] = useState<ReportEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/reports')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.data || [])
      } else {
        toastError('Failed to load reports (admin access required)')
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: ReportEntry['status']) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
        toastSuccess(`Marked as ${STATUS_LABELS[status]}`)
      } else {
        toastError('Failed to update')
      }
    } catch {
      toastError('Failed to update')
    }
  }

  const filtered = statusFilter ? entries.filter(e => e.status === statusFilter) : entries
  const pendingCount = entries.filter(e => e.status === 'PENDING').length

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Reports' }]} />
      <div className={styles.header}>
        <div>
          <h1>Reports</h1>
          <p>Community flags ({entries.length} total, {pendingCount} pending)</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWING">Reviewing</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Reason</th>
              <th>Details</th>
              <th>Reporter</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}>
                <td>{ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType}</td>
                <td>{REASON_LABELS[entry.reason] || entry.reason}</td>
                <td className={styles.messageCell}>
                  <div>{entry.description || '-'}</div>
                  <a href={`/admin/reports/${entry.id}`} className={styles.reportLink}>#{entry.entityId}</a>
                </td>
                <td>{entry.reporter?.name || entry.reporter?.username || entry.reporter?.id || '-'}</td>
                <td>
                  <span className={entry.status === 'RESOLVED' ? styles.reviewed : styles.newStatus}>
                    {STATUS_LABELS[entry.status]}
                  </span>
                </td>
                <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className={styles.actionsWrap}>
                    <button onClick={() => updateStatus(entry.id, 'RESOLVED')} className={styles.reviewBtn}>
                      Resolve
                    </button>
                    <button onClick={() => updateStatus(entry.id, 'DISMISSED')} className={styles.dismissBtn}>
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={styles.empty}>No reports found.</div>
        )}
      </div>
    </div>
  )
}