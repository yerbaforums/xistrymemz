'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './LiveBadge.module.css'

export interface LiveUser {
  user: { id: string; name: string | null; image: string | null; username: string | null }
  roomId: string
  inviteCode: string
  mode: string
  roomName: string | null
  podcastSlug: string | null
  viewers: number
  isHost: boolean
}

// Pulsing red presence badge. Links to the podcast when the room is a
// live broadcast, otherwise to the video room invite.
export function liveHref(entry: Pick<LiveUser, 'podcastSlug' | 'inviteCode'>): string {
  if (entry.podcastSlug) return `/podcast/${entry.podcastSlug}`
  return `/dashboard/video?invite=${entry.inviteCode}`
}

export default function LiveBadge({ entry, size = 'md' }: { entry: LiveUser; size?: 'sm' | 'md' }) {
  return (
    <Link href={liveHref(entry)} className={`${styles.badge} ${size === 'sm' ? styles.sm : ''}`} title={entry.roomName || `${entry.user.name || 'Someone'} is live`}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>LIVE</span>
      {entry.viewers > 1 && <span className={styles.viewers}>{entry.viewers}</span>}
    </Link>
  )
}

// Per-user presence for headers/cards: renders nothing unless this user is
// currently live. Fetches the shared live-now payload once per mount.
export function UserLiveBadge({ userId, size = 'sm' }: { userId: string; size?: 'sm' | 'md' }) {
  const [entry, setEntry] = useState<LiveUser | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/live-now')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        const rows = d?.data?.live || d?.live || []
        const found = Array.isArray(rows) ? rows.find((e: LiveUser) => e.user.id === userId) : null
        setEntry(found || null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])
  if (!entry) return null
  return <LiveBadge entry={entry} size={size} />
}
