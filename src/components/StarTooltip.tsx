'use client'

import Link from 'next/link'
import type { ConstellationStar } from '@/lib/constellation'
import { CLASS_ICONS } from '@/lib/user-classes'
import RoleBadge from '@/components/RoleBadge'
import styles from './StarTooltip.module.css'

interface StarTooltipProps {
  star: ConstellationStar
  x: number
  y: number
}

function getRelativeTime(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Inactive'
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 5) return 'Active now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function StarTooltip({ star, x, y }: StarTooltipProps) {
  const cls = star.userClass?.split(',')[0]?.trim()

  return (
    <div
      className={styles.tooltip}
      style={{
        left: Math.min(x + 14, window.innerWidth - 260),
        top: Math.min(y + 14, window.innerHeight - 180),
      }}
    >
      <div className={styles.header}>
        {star.image ? (
          <img src={star.image} alt="" className={styles.avatar} />
        ) : (
          <span className={styles.avatarPlaceholder}>{star.title[0]?.toUpperCase() || '?'}</span>
        )}
        <div className={styles.headerInfo}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{star.title}</span>
            <RoleBadge role={star.role || 'USER'} />
          </div>
          {star.username && <span className={styles.username}>@{star.username}</span>}
        </div>
      </div>

      <div className={styles.meta}>
        {star.location && <span className={styles.metaItem} title="Location">📍 {star.location}</span>}
        {cls && (
          <span className={`${styles.metaItem} ${styles.classItem}`} title={`Class: ${cls}`}>
            {CLASS_ICONS[cls] || '✦'} {cls}
          </span>
        )}
      </div>

      <div className={styles.statusRow}>
        <span
          className={styles.statusDot}
          style={{
            background: star.active ? '#22c55e' : star.alpha > 0.6 ? '#a3e635' : 'rgba(148, 163, 184, 0.5)',
          }}
        />
        <span className={styles.statusLabel}>{getRelativeTime(star.lastActiveAt)}</span>
        <span className={styles.reputation}>✦ {star.reputationScore}</span>
      </div>

      <div className={styles.connection}>
        {star.connectionStrength >= 1
          ? '🟢 Connected'
          : star.connectionStrength >= 0.6
            ? `🤝 Shares ${star.groupIds.length} group${star.groupIds.length === 1 ? '' : 's'}`
            : '💫 Nearby'}
      </div>

      {star.lookingForCollaborators && (
        <div className={styles.collabBadge}>🤝 Looking for collaborators</div>
      )}

      <Link href={`/profile/${star.username || star.id}`} className={styles.profileLink}>
        View Profile →
      </Link>
    </div>
  )
}