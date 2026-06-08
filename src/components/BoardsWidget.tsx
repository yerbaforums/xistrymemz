'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Skeleton from '@/components/Skeleton'
import styles from './BoardsWidget.module.css'

export default function BoardsWidget() {
  const [boards, setBoards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/boards?limit=3&my=true')
      .then(res => res.ok ? res.json() : null)
      .then(data => { setBoards(data?.boards || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className={styles.widget}><Skeleton width="100%" height="3rem" /></div>
  if (boards.length === 0) return null

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h3>📌 My Boards</h3>
        <Link href="/boards" className={styles.viewAll}>View All →</Link>
      </div>
      <div className={styles.list}>
        {boards.map((b: any) => (
          <Link key={b.id} href={`/boards/${b.slug}`} className={styles.item}>
            <div className={styles.dot} />
            <div className={styles.info}>
              <div className={styles.name}>{b.name}</div>
              <div className={styles.meta}>{b.location || 'Unknown'} · 📌 {b.pinCount} pins</div>
            </div>
            <span className={styles.arrow}>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
