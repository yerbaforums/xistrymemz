'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface DealItem {
  kind: 'Order' | 'Request' | 'Offer' | 'Appointment'
  id: string
  title: string
  counterpart: string
  status: string
  role: string
  href: string
  actionNeeded: boolean
  updatedAt: Date | null
  amount?: number | null
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'var(--accent-warning, #f59e0b)',
  PAID: 'var(--accent-primary, #3b82f6)',
  SHIPPED: 'var(--accent-primary, #3b82f6)',
  ACCEPTED: '#22c55e',
  CONFIRMED: '#22c55e',
  IN_PROGRESS: '#f59e0b',
  DELIVERED: '#10b981',
  COMPLETED: '#10b981',
  CANCELLED: '#6b7280',
  REJECTED: '#ef4444',
  WITHDRAWN: '#6b7280',
}

const KIND_ICON: Record<string, string> = {
  Order: '📦',
  Request: '📝',
  Offer: '💼',
  Appointment: '🗓️',
}

export default function DealRow({ deal, styles }: { deal: DealItem; styles: Record<string, string> }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const runAppointmentAction = async (action: 'accept' | 'decline' | 'cancel' | 'complete') => {
    setBusy(action)
    try {
      const res = await fetch(`/api/appointments/${deal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) router.refresh()
    } catch { /* row refresh covers */ } finally {
      setBusy(null)
    }
  }

  const isAppointment = deal.kind === 'Appointment'
  const isHost = deal.role === 'Host'
  const final = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(deal.status)

  return (
    <div className={styles.item}>
      <Link href={deal.href} className={styles.itemMain} style={{ flex: 1 }}>
        <span className={styles.itemTitle}>
          {KIND_ICON[deal.kind]} {deal.title}
        </span>
        <span className={styles.itemMeta}>
          {deal.kind} • {deal.role} • {deal.counterpart}
          {deal.amount != null && deal.amount > 0 && ` • $${deal.amount.toFixed(2)}`}
          {deal.actionNeeded && (
            <span className={styles.actionBadge}>
              ⚡ Action needed
            </span>
          )}
        </span>
      </Link>
      <span
        className={styles.itemStatus}
        style={{ color: STATUS_COLOR[deal.status] || undefined, borderColor: STATUS_COLOR[deal.status] || undefined }}
      >
        {deal.status}
      </span>
      {isAppointment && !final && (
        <span style={{ display: 'flex', gap: 6 }}>
          {isHost && deal.status === 'PENDING' && (
            <>
              <button disabled={!!busy} onClick={() => runAppointmentAction('accept')} aria-label="Confirm appointment" style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>
                {busy === 'accept' ? '...' : 'Confirm'}
              </button>
              <button disabled={!!busy} onClick={() => runAppointmentAction('decline')} aria-label="Decline appointment" style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem' }}>
                {busy === 'decline' ? '...' : 'Decline'}
              </button>
            </>
          )}
          {isHost && (deal.status === 'CONFIRMED' || deal.status === 'PAID') && (
            <button disabled={!!busy} onClick={() => runAppointmentAction('complete')} aria-label="Complete appointment" style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>
              {busy === 'complete' ? '...' : 'Complete'}
            </button>
          )}
          {!final && (
            <button disabled={!!busy} onClick={() => runAppointmentAction('cancel')} aria-label="Cancel appointment" style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}>
              {busy === 'cancel' ? '...' : 'Cancel'}
            </button>
          )}
        </span>
      )}
    </div>
  )
}
