'use client'

import Link from 'next/link'
import type { PlatformStats } from './types'
import { useTranslations } from 'next-intl'
import styles from './StatsSection.module.css'

interface Props {
  stats: PlatformStats
}

export default function StatsSection({ stats }: Props) {
  const t = useTranslations('home')

  const STAT_CARDS = [
    { key: 'members' as const, icon: '👥', label: t('statsMembers'), href: '/community' },
    { key: 'shops' as const, icon: '🏪', label: t('statsShops'), href: '/shops' },
    { key: 'schools' as const, icon: '🏫', label: t('statsSchools'), href: '/schools' },
    { key: 'products' as const, icon: '🛒', label: t('statsProducts'), href: '/products' },
    { key: 'services' as const, icon: '🔧', label: t('statsServices'), href: '/services' },
    { key: 'rentals' as const, icon: '🏠', label: t('statsRentals'), href: '/rentals' },
    { key: 'forumPosts' as const, icon: '📣', label: t('statsForumPosts'), href: '/community/forum' },
    { key: 'forumReplies' as const, icon: '💬', label: t('statsForumReplies'), href: '/community/forum' },
    { key: 'events' as const, icon: '📅', label: t('statsEvents'), href: '/events' },
    { key: 'plans' as const, icon: '🚀', label: t('statsProjects'), href: '/plans/public' },
    { key: 'requests' as const, icon: '📝', label: t('statsRequests'), href: '/requests' },
    { key: 'offers' as const, icon: '🤝', label: t('statsOffers'), href: '/dashboard/offers' },
    { key: 'appointments' as const, icon: '🗓️', label: t('statsAppointments'), href: '/dashboard/appointments' },
  ]

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>{t('statsTitle')}</h2>
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
