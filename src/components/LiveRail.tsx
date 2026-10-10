'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import LiveBadge, { type LiveUser } from '@/components/LiveBadge'
import styles from './LiveRail.module.css'

// "Live now" strip: everyone currently broadcasting. Null when nobody is
// live so quiet pages stay quiet. Refreshes every 2 minutes.
export default function LiveRail({ compact = false }: { compact?: boolean }) {
  const [live, setLive] = useState<LiveUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/live-now')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (cancelled) return
          const rows = d?.data?.live || d?.live || []
          setLive(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false) })
    }
    load()
    const t = setInterval(load, 120000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (loading) return null
  if (live.length === 0) return null

  return (
    <section className={styles.rail} aria-label="Live now">
      <div className={styles.head}>
        <span className={styles.dot} aria-hidden="true" />
        <h2 className={styles.title}>Live now</h2>
        <span className={styles.count}>{live.length}</span>
      </div>
      <div className={styles.list}>
        {live.slice(0, compact ? 4 : 8).map(entry => (
          <Link
            key={entry.user.id}
            href={entry.podcastSlug ? `/podcast/${entry.podcastSlug}` : `/dashboard/video?invite=${entry.inviteCode}`}
            className={styles.card}
          >
            {entry.user.image ? (
              <Image src={entry.user.image} alt="" width={40} height={40} className={styles.avatar} />
            ) : (
              <span className={styles.avatarFallback}>{(entry.user.name || 'U')[0]}</span>
            )}
            <span className={styles.info}>
              <span className={styles.name}>{entry.user.name || 'Anonymous'}</span>
              <span className={styles.meta}>
                {entry.mode === 'AUDIO' ? '🎙️ Audio' : '🎥 Video'}
                {entry.viewers > 1 ? ` · ${entry.viewers} watching` : ''}
              </span>
            </span>
            <LiveBadge entry={entry} size="sm" />
          </Link>
        ))}
      </div>
    </section>
  )
}
