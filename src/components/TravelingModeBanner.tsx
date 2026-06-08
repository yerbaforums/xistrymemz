'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import Skeleton from '@/components/Skeleton'
import styles from './TravelingModeBanner.module.css'

export default function TravelingModeBanner() {
  const { location: passport } = usePassportLocation()
  const [boards, setBoards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!passport?.latitude || !passport?.longitude) { setLoading(false); return }
    fetch(`/api/boards?lat=${passport.latitude}&lng=${passport.longitude}&radius=${passport.searchRadius || 50}&limit=3`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setBoards(data?.boards || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [passport])

  if (!passport?.traveling) return null

  return (
    <div className={styles.banner}>
      <div className={styles.header}>
        <span className={styles.icon}>✈️</span>
        <div>
          <div className={styles.title}>Traveling Mode — {passport.location || 'Exploring'}</div>
          <div className={styles.sub}>Showing boards and content near your current location. <Link href="/dashboard/passport" className={styles.link}>Switch to Home</Link></div>
        </div>
        <Link href="/discover" className={styles.exploreBtn}>Explore Area →</Link>
      </div>
      {loading ? (
        <div className={styles.loading}><Skeleton width="100%" height="2rem" /></div>
      ) : boards.length > 0 && (
        <div className={styles.boards}>
          {boards.map((b: any) => (
            <Link key={b.id} href={`/boards/${b.slug}`} className={styles.boardCard}>
              <div className={styles.boardName}>📌 {b.name}</div>
              <div className={styles.boardMeta}>{b.location} · {b.pinCount} pins</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
