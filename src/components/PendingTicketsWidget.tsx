'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import styles from './BoardsWidget.module.css'

interface TicketInfo {
  id: string
  userId: string
  quantity: number
  paymentStatus: string
  ticketCode: string
  txHash: string | null
  selectedCurrency: string | null
  user: { id: string; name: string | null }
  event: { id: string; title: string; eventDate: string | null; ticketPrice: number; currency: string }
}

export default function PendingTicketsWidget() {
  const [tickets, setTickets] = useState<TicketInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/tickets?status=PENDING')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const all = data?.data?.tickets || data?.tickets || []
        setTickets(all)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.widget}><Skeleton width="100%" height="3rem" /></div>
  if (tickets.length === 0) return null

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3>🎫 Pending Ticket Requests ({tickets.length})</h3>
        <Link href="/dashboard/events" className={styles.viewAll}>Manage →</Link>
      </div>
      <div className={styles.list}>
        {tickets.slice(0, 3).map((t) => (
          <Link key={t.id} href={`/events/${t.event.id}`} className={styles.item}>
            <div className={styles.dot} style={{ background: '#f59e0b' }} />
            <div className={styles.info}>
              <div className={styles.name}>{t.event.title}</div>
              <div className={styles.meta}>
                {t.user.name || 'Unknown'} · {t.quantity} ticket{t.quantity > 1 ? 's' : ''}
                {t.selectedCurrency && <> · {t.selectedCurrency}</>}
              </div>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
