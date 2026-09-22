'use client'

import Link from 'next/link'
import styles from './ActionQueue.module.css'

/** Rank used to order queue rows — money/time-sensitive items float to the top. */
const KIND_RANK: Record<string, number> = {
  appointment: 0,
  order: 1,
  offer: 2,
  request: 3,
  connection: 4,
  ticket: 5,
  sponsorship: 6,
  other: 7,
}

export interface ActionQueueItem {
  icon: string
  label: string
  href: string
  kind?: keyof typeof KIND_RANK | string
}

export default function ActionQueue({ items }: { items: ActionQueueItem[] }) {
  if (!items.length) return null

  const ranked = [...items].sort(
    (a, b) => (KIND_RANK[a.kind ?? 'other'] ?? 7) - (KIND_RANK[b.kind ?? 'other'] ?? 7),
  )

  return (
    <section className={styles.queue} role="status" aria-label="Needs your attention">
      <div className={styles.header}>
        <span className={styles.headerIcon} aria-hidden>⚡</span>
        <h3>Needs your attention</h3>
        <span className={styles.count}>{items.length}</span>
      </div>
      <div className={styles.rows}>
        {ranked.map(item => (
          <Link key={item.href + item.label} href={item.href} className={styles.row}>
            <span className={styles.rowIcon} aria-hidden>{item.icon}</span>
            <span className={styles.rowLabel}>{item.label}</span>
            <span className={styles.rowArrow} aria-hidden>→</span>
          </Link>
        ))}
      </div>
    </section>
  )
}