'use client'

import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { getUserProfileUrl } from '@/lib/utils'
import { CLASS_ICONS } from '@/lib/user-classes'
import type { RecentMember, PlatformStats } from './types'
import styles from './MemberSpotlightSection.module.css'

interface Props {
  members: RecentMember[]
  loading: boolean
  stats: PlatformStats
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function MemberSpotlightSection({ members, loading, stats }: Props) {
  const { ref, visible } = useScrollReveal()

  return (
    <section ref={ref} className={`${styles.section} ${visible ? styles.visible : ''}`}>
      <h2 className={styles.sectionTitle}>Meet the Community</h2>
      <p className={styles.sectionSubtitle}>Newest neighbors joining the cooperative</p>

      {loading ? (
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} width="100%" height="180px" borderRadius="var(--radius-lg)" />
          ))}
        </div>
      ) : members.length > 0 ? (
        <div className={styles.grid}>
          {members.map(m => (
            <Link key={m.id} href={getUserProfileUrl(m)} className={styles.card}>
              <div className={styles.avatarWrap}>
                {m.image ? (
                  <img src={m.image} alt={m.name || 'Member'} className={styles.avatar} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(m.name || m.username || '?')[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <h3 className={styles.name}>{m.name || m.username}</h3>
              <p className={styles.handle}>@{m.username || m.id}</p>
              <p className={styles.joined}>Joined {formatJoined(m.createdAt)}</p>
              <div className={styles.chips}>
                {m.userClass?.split(',').map(c => c.trim()).filter(Boolean).slice(0, 2).map(c => (
                  <span key={c} className={styles.chip}>{CLASS_ICONS[c] || '👤'} {c}</span>
                ))}
                {m.posts > 0 && <span className={styles.chip}>💬 {m.posts}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No members yet — be the first to join.</p>
      )}

      <div className={styles.engagement}>
        <div className={styles.engagementRow}>
          <span><strong>{stats.members}</strong> members</span>
          <span><strong>{stats.forumPosts}</strong> forum posts</span>
          <span><strong>{stats.forumReplies}</strong> replies</span>
        </div>
      </div>

      <div className={styles.actions}>
        <Link href="/community" className={styles.viewAll}>View all members →</Link>
      </div>
    </section>
  )
}