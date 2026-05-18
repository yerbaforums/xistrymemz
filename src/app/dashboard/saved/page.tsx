'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'

interface SavedItem {
  id: string
  itemType: string
  itemId: string
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  PLAN: 'Project',
  PRODUCT: 'Product',
  REQUEST: 'Request',
  EVENT: 'Event',
  POST: 'Post',
  FORUM_POST: 'Forum Post',
}

const TYPE_LINKS: Record<string, string> = {
  PLAN: '/plans',
  PRODUCT: '/products',
  REQUEST: '/requests',
  EVENT: '/events',
  POST: '/posts',
  FORUM_POST: '/community/forum',
}

export default function SavedPage() {
  const { status } = useSession()
  const router = useRouter()
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status !== 'authenticated') return

    fetch('/api/saved')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.saved) setSaved(data.saved)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [status, router])

  const unsave = async (id: string) => {
    const res = await fetch(`/api/saved/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSaved(saved.filter(s => s.id !== id))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Saved Items</h1>
        <p className={styles.subtitle}>Items you&apos;ve bookmarked for later</p>

        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : saved.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>☆</div>
            <h2>Nothing saved yet</h2>
            <p>Save plans, products, requests, and more to find them quickly later.</p>
            <div className={styles.emptyLinks}>
              <Link href="/plans/public" className={styles.btn}>Browse Projects</Link>
              <Link href="/shops" className={styles.btn}>Browse Shops</Link>
              <Link href="/requests" className={styles.btn}>Browse Requests</Link>
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {saved.map(item => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardBody}>
                  <span className={styles.badge}>{TYPE_LABELS[item.itemType] || item.itemType}</span>
                  <span className={styles.date}>
                    Saved {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    href={`${TYPE_LINKS[item.itemType] || '/'}/${item.itemId}`}
                    className={styles.viewLink}
                  >
                    View →
                  </Link>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => unsave(item.id)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
