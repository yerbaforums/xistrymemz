'use client'

import { useMemo, useState } from 'react'
import DealRow, { type DealItem } from './DealRow'

interface Props {
  deals: DealItem[]
  styles: Record<string, string>
}

const KIND_FILTERS: Array<{ key: string; icon: string; label: string }> = [
  { key: 'ALL', icon: '🌟', label: 'All' },
  { key: 'Order', icon: '📦', label: 'Orders' },
  { key: 'Request', icon: '📝', label: 'Requests' },
  { key: 'Offer', icon: '💼', label: 'Offers' },
  { key: 'Appointment', icon: '🗓️', label: 'Appointments' },
  { key: 'GroupBuy', icon: '🛒', label: 'Group Buys' },
]

export default function DealsList({ deals, styles }: Props) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('ALL')
  const [actionOnly, setActionOnly] = useState(false)
  const [sort, setSort] = useState<'recent' | 'amount'>('recent')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const items = deals.filter(d => {
      if (kind !== 'ALL' && d.kind !== kind) return false
      if (actionOnly && !d.actionNeeded) return false
      if (q && !(d.title.toLowerCase().includes(q) || d.counterpart.toLowerCase().includes(q))) return false
      return true
    })
    return [...items].sort((a, b) => {
      if (sort === 'amount') return (b.amount ?? 0) - (a.amount ?? 0)
      const aT = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const bT = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return bT - aT
    })
  }, [deals, query, kind, actionOnly, sort])

  return (
    <div className={styles.section}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.searchBar}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search deals (title or counterpart)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search deals"
            />
          </div>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={actionOnly}
              onChange={e => setActionOnly(e.target.checked)}
            />
            ⚡ Action needed
          </label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value as 'recent' | 'amount')}
            className={styles.sortSelect}
            aria-label="Sort deals"
          >
            <option value="recent">Sort: Recent</option>
            <option value="amount">Sort: Highest value</option>
          </select>
        </div>
        <div className={styles.pillRow} role="group" aria-label="Filter by kind">
          {KIND_FILTERS.map(f => {
            const count = f.key === 'ALL'
              ? deals.length
              : deals.filter(d => d.kind === f.key).length
            return (
              <button
                key={f.key}
                onClick={() => setKind(f.key)}
                className={`${styles.pillBtn} ${kind === f.key ? styles.active : ''}`}
                aria-pressed={kind === f.key}
              >
                {f.icon} {f.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults}>
          No deals match your filters — try clearing the search or switching kinds.
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map(deal => (
            <DealRow key={`${deal.kind}-${deal.id}`} deal={deal} styles={styles} />
          ))}
        </div>
      )}
    </div>
  )
}