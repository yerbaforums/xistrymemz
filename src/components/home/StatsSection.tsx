'use client'

import Link from 'next/link'
import type { PlatformStats } from './types'
import styles from './StatsSection.module.css'

const STAT_CARDS = [
  { key: 'members' as const, icon: '👥', label: 'Members', href: '/community' },
  { key: 'shops' as const, icon: '🏪', label: 'Shops', href: '/shops' },
  { key: 'schools' as const, icon: '🏫', label: 'Schools', href: '/schools' },
  { key: 'products' as const, icon: '🛒', label: 'Products', href: '/products' },
  { key: 'services' as const, icon: '🔧', label: 'Services', href: '/services' },
  { key: 'rentals' as const, icon: '🏠', label: 'Rentals', href: '/rentals' },
  { key: 'forumPosts' as const, icon: '📣', label: 'Forum Posts', href: '/community/forum' },
  { key: 'forumReplies' as const, icon: '💬', label: 'Forum Replies', href: '/community/forum' },
  { key: 'events' as const, icon: '📅', label: 'Events', href: '/events' },
  { key: 'plans' as const, icon: '🚀', label: 'Projects', href: '/plans/public' },
  { key: 'requests' as const, icon: '📝', label: 'Requests', href: '/requests' },
  { key: 'offers' as const, icon: '🤝', label: 'Offers', href: '/dashboard/offers' },
  { key: 'appointments' as const, icon: '🗓️', label: 'Appointments', href: '/dashboard/appointments' },
]

interface Props {
  stats: PlatformStats
}

export default function StatsSection({ stats }: Props) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Platform Stats</h2>
        <div className={styles.grid}>
          {STAT_CARDS.map(card => (
            <Link key={card.key} href={card.href} className={styles.card}>
              <span className={styles.icon}>{card.icon}</span>
              <span className={styles.value}>{stats[card.key]}</span>
              <span className={styles.label}>{card.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
