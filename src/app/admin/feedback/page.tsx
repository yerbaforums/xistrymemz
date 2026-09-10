'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'

interface FeedbackEntry {
  id: string
  category: string
  message: string
  email?: string
  screenshot?: string
  userId?: string
  status: 'NEW' | 'REVIEWED'
  createdAt: string
}

export default function AdminFeedbackPage() {
  const { success: toastSuccess, error: toastError } = useToast()
  const [entries, setEntries] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/feedback')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.data || [])
      }
    } catch {
      // noop
    } finally {
      setLoading(false)
    }
  }

  const markReviewed = async (id: string) => {
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: 'PATCH' })
      if (res.ok) {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'REVIEWED' as const } : e))
        toastSuccess('Marked as reviewed')
      } else {
        toastError('Failed to update')
      }
    } catch {
      toastError('Failed to update')
    }
  }

  const filtered = entries.filter(e => {
    if (statusFilter && e.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return e.message.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q)
    }
    return true
  })

  if (loading) {
    return <div className={styles.container}><Skeleton width="100%" height="2rem" /></div>
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Feedback' }]} />
      <div className={styles.header}>
        <div>
          <h1>Feedback</h1>
          <p>User submissions ({entries.length} total)</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          placeholder="Search feedback..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="REVIEWED">Reviewed</option>
        </select>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Message</th>
              <th>Email</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <tr key={entry.id}>
                <td>{entry.category}</td>
                <td className={styles.messageCell}>{entry.message.length > 80 ? entry.message.slice(0, 80) + '...' : entry.message}</td>
                <td>{entry.email || entry.userId || '-'}</td>
                <td>
                  <span className={entry.status === 'REVIEWED' ? styles.reviewed : styles.newStatus}>
                    {entry.status}
                  </span>
                </td>
                <td>{new Date(entry.createdAt).toLocaleDateString()}</td>
                <td>
                  {entry.status === 'NEW' && (
                    <button onClick={() => markReviewed(entry.id)} className={styles.reviewBtn}>
                      Mark Reviewed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className={styles.empty}>No feedback entries found.</div>
        )}
      </div>
    </div>
  )
}
