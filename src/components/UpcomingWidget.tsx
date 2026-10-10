'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import styles from './BoardsWidget.module.css'

interface UpcomingItem {
  id: string
  title: string
  start: string
  kind: 'appointment' | 'event'
  status?: string
  href: string
}

function toDate(v: unknown): number {
  const t = v ? new Date(v as string).getTime() : NaN
  return Number.isNaN(t) ? Infinity : t
}

// What's coming up: confirmed/pending appointments plus joined/personal
// events, merged chronologically. Returns null when empty so quiet
// dashboards stay quiet.
export default function UpcomingWidget() {
  const [items, setItems] = useState<UpcomingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/appointments').then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/calendar/events').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([a, c]) => {
        const now = Date.now()
        const appts = (((a && a.data && a.data.appointments) || (a && a.appointments)) || [])
          .filter((x: { startTime?: string; status?: string }) => x && x.startTime && toDate(x.startTime) >= now - 3600000 && ['PENDING', 'CONFIRMED', 'PAID'].includes(x.status || 'CONFIRMED'))
          .map((x: { id: string; title: string; startTime: string; status: string }) => ({
            id: `appt-${x.id}`,
            title: x.title,
            start: x.startTime,
            kind: 'appointment' as const,
            status: x.status,
            href: `/dashboard/appointments?highlight=${x.id}`,
          }))
        const evts = [
          ...(((c && c.myEvents) || [])),
          ...(((c && c.publicEvents) || [])),
        ]
          .filter((x: { startDate?: string }) => x && x.startDate && toDate(x.startDate) >= now - 3600000)
          .map((x: { id: string; title: string; startDate: string }) => ({
            id: `evt-${x.id}`,
            title: x.title,
            start: x.startDate,
            kind: 'event' as const,
            href: '/dashboard/calendar',
          }))
        setItems([...appts, ...evts].sort((p, q) => toDate(p.start) - toDate(q.start)).slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.widget}><Skeleton width="100%" height="3rem" /></div>
  if (items.length === 0) return null

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3>🗓️ Coming Up ({items.length})</h3>
        <Link href="/dashboard/calendar" className={styles.viewAll}>Planner →</Link>
      </div>
      <div className={styles.list}>
        {items.map((it) => (
          <Link key={it.id} href={it.href} className={styles.item}>
            <div className={styles.dot} style={{ background: it.kind === 'appointment' ? '#6366f1' : '#10b981' }} />
            <div className={styles.info}>
              <div className={styles.name}>{it.title}</div>
              <div className={styles.meta}>
                {new Date(it.start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                {' · '}
                {new Date(it.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                {it.status ? ` · ${it.status}` : ''}
              </div>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
