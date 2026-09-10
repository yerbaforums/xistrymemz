'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import styles from './ConstellationPreview.module.css'

export default function ConstellationPreview() {
  const { status } = useSession()
  const [stats, setStats] = useState<{ members: number; connections: number; groups: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/constellation?limit=120').then(r => r.ok ? r.json() : null),
    ])
      .then(([data]) => {
        const d = data?.data || data
        if (d?.stars && d?.currentUser) {
          setStats({
            members: d.stars.length,
            connections: d.currentUser.connectedIds.length,
            groups: d.currentUser.groupIds.length,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status])

  if (status !== 'authenticated') return null
  if (loading || !stats) return null

  return (
    <Link href="/community?tab=constellation" className={styles.widget}>
      <div className={styles.visual}>
        <span className={styles.starOwn} />
        <span className={`${styles.starConn} ${styles.c1}`} />
        <span className={`${styles.starConn} ${styles.c2}`} />
        <span className={`${styles.starConn} ${styles.c3}`} />
        <span className={styles.line1} />
        <span className={styles.line2} />
        <span className={styles.line3} />
      </div>
      <div className={styles.body}>
        <span className={styles.title}>🌌 Your Constellation</span>
        <span className={styles.sub}>
          {stats.members} members nearby · {stats.connections} connected · {stats.groups} groups
        </span>
        <span className={styles.cta}>Explore →</span>
      </div>
    </Link>
  )
}