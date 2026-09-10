'use client'

import Link from 'next/link'
import type { ConstellationStar } from '@/lib/constellation'
import { CLASS_ICONS } from '@/lib/user-classes'
import styles from './OrbitPanel.module.css'

interface OrbitPanelProps {
  star: ConstellationStar
  onClose: () => void
}

interface OrbitEntity {
  type: string
  emoji: string
  label: string
  count: number
  href: string
}

const ORBIT_ENTITIES: Omit<OrbitEntity, 'count' | 'href'>[] = [
  { type: 'PRODUCT', emoji: '🛒', label: 'Products' },
  { type: 'PROJECT', emoji: '🚀', label: 'Projects' },
  { type: 'EVENT', emoji: '📅', label: 'Events' },
  { type: 'REQUEST', emoji: '📝', label: 'Requests' },
  { type: 'GROUP', emoji: '👥', label: 'Groups' },
  { type: 'POST', emoji: '💬', label: 'Posts' },
]

export default function OrbitPanel({ star, onClose }: OrbitPanelProps) {
  const counts = star.entityCounts || {
    projects: 0,
    products: 0,
    events: 0,
    requests: 0,
    groups: star.groupIds.length,
    posts: 0,
  }

  const cls = star.userClass?.split(',')[0]?.trim()

  const entities: OrbitEntity[] = ORBIT_ENTITIES.map(e => {
    let count = 0
    let href = '#'
    switch (e.type) {
      case 'PRODUCT':
        count = counts.products
        href = `/products?user=${star.id}`
        break
      case 'PROJECT':
        count = counts.projects
        href = `/projects?user=${star.id}`
        break
      case 'EVENT':
        count = counts.events
        href = `/events?organizer=${star.id}`
        break
      case 'REQUEST':
        count = counts.requests
        href = `/requests?user=${star.id}`
        break
      case 'GROUP':
        count = counts.groups
        href = `/community/groups`
        break
      case 'POST':
        count = counts.posts
        href = `/posts?user=${star.id}`
        break
    }
    return { ...e, count, href }
  }).filter(e => e.count > 0)

  return (
    <aside className={styles.panel}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">✕</button>

      <div className={styles.header}>
        {star.image ? (
          <img src={star.image} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatarPlaceholder}>{star.title[0]?.toUpperCase() || '?'}</span>
        )}
        <div className={styles.headerInfo}>
          <h2 className={styles.name}>{star.title}</h2>
          {star.username && <span className={styles.username}>@{star.username}</span>}
          <div className={styles.badges}>
            {cls && (
              <span className={styles.classBadge}>
                {CLASS_ICONS[cls] || '✦'} {cls}
              </span>
            )}
            {star.active && <span className={styles.activeBadge}>🟢 Active now</span>}
            {star.lookingForCollaborators && (
              <span className={styles.collabBadge}>🤝 Collaborating</span>
            )}
          </div>
        </div>
      </div>

      {star.location && (
        <p className={styles.location}>📍 {star.location}</p>
      )}

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Reputation</span>
          <span className={styles.metaValue}>✦ {star.reputationScore}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Connection</span>
          <span className={styles.metaValue}>
            {star.connectionStrength >= 1
              ? 'Connected'
              : star.groupIds.length > 0
                ? `${star.groupIds.length} shared group${star.groupIds.length === 1 ? '' : 's'}`
                : 'Open'}
          </span>
        </div>
      </div>

      {entities.length > 0 && (
        <div className={styles.orbitSection}>
          <h3 className={styles.sectionTitle}>✨ Orbit</h3>
          <div className={styles.orbitGrid}>
            {entities.map(e => (
              <Link key={e.type} href={e.href} className={styles.orbitItem}>
                <span className={styles.orbitIcon}>{e.emoji}</span>
                <span className={styles.orbitLabel}>{e.label}</span>
                <span className={styles.orbitCount}>{e.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <Link href={`/profile/${star.username || star.id}`} className={styles.primaryBtn}>
          View Full Profile
        </Link>
      </div>
    </aside>
  )
}