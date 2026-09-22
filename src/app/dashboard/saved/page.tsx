'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import ListingToolbar, { type PillOption } from '@/components/ListingToolbar'
import { useManagedList } from '@/hooks/useManagedList'
import { downloadCSV } from '@/lib/csv'

interface SavedItem {
  id: string
  itemType: string
  itemId: string
  createdAt: string
  title: string | null
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; href: string }> = {
  PLAN: { icon: '🚀', label: 'Project', href: '/projects' },
  PRODUCT: { icon: '🛒', label: 'Product', href: '/products' },
  SERVICE: { icon: '🔧', label: 'Service', href: '/services' },
  RENTAL: { icon: '🏠', label: 'Rental', href: '/rentals' },
  REQUEST: { icon: '📝', label: 'Request', href: '/requests' },
  EVENT: { icon: '📅', label: 'Event', href: '/events' },
  POST: { icon: '✏️', label: 'Post', href: '/posts' },
  FORUM_POST: { icon: '💬', label: 'Forum Post', href: '/community/forum' },
  SCHOOLCONTENT: { icon: '📖', label: 'Content', href: '/school' },
  GROUP: { icon: '👥', label: 'Group', href: '/community/groups' },
}

export default function SavedPage() {
  const { status } = useSession()
  const router = useRouter()
  const [saved, setSaved] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const managed = useManagedList({ persistView: true })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status !== 'authenticated') return

    fetch('/api/saved')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.data?.saved || data?.saved) setSaved(data?.data?.saved || data?.saved || [])
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

  const counts: Record<string, number> = {}
  for (const item of saved) {
    counts[item.itemType] = (counts[item.itemType] || 0) + 1
  }

  const filtered = (managed.filter === 'all' ? saved : saved.filter(s => s.itemType === managed.filter))
    .filter(s => !managed.search || s.title?.toLowerCase().includes(managed.search.toLowerCase()) || (TYPE_CONFIG[s.itemType]?.label || s.itemType).toLowerCase().includes(managed.search.toLowerCase()))
  const typeKeys = Object.keys(counts).sort()

  const pillOptions: PillOption[] = [
    { value: 'all', label: 'All', count: saved.length },
    ...typeKeys.map(type => ({
      value: type,
      label: `${TYPE_CONFIG[type]?.icon || '📌'} ${TYPE_CONFIG[type]?.label || type}`,
      count: counts[type],
    })),
  ]

  const exportCSV = () => {
    downloadCSV(
      `saved-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Type', 'Title', 'Saved At'],
      filtered.map(item => [
        TYPE_CONFIG[item.itemType]?.label || item.itemType,
        item.title || 'Untitled',
        new Date(item.createdAt).toLocaleDateString(),
      ]),
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>⭐ Saved Items</h1>
        <p className={styles.subtitle}>Items you&apos;ve bookmarked for later</p>

        {loading ? (
          <Skeleton width="100%" height="2rem" />
        ) : saved.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>☆</div>
            <h2>Nothing saved yet</h2>
            <p>Save plans, products, requests, and more to find them quickly later.</p>
            <div className={styles.emptyLinks}>
              <Link href="/projects" className={styles.btn}>Browse Projects</Link>
              <Link href="/shops" className={styles.btn}>Browse Shops</Link>
              <Link href="/requests" className={styles.btn}>Browse Requests</Link>
            </div>
          </div>
        ) : (
          <>
            <ListingToolbar
              search={managed.search}
              onSearch={managed.setSearch}
              searchPlaceholder="Search saved items..."
              pills={pillOptions}
              activePill={managed.filter}
              onPillChange={managed.setFilter}
              view={{ mode: managed.view, onChange: managed.changeView }}
              count={filtered.length}
              countLabel="saved"
              onExport={exportCSV}
            />

            <div className={managed.view === 'grid' ? styles.grid : styles.list}>
              {filtered.length === 0 && (
                <div className={styles.emptySmall}>No saved items in this category</div>
              )}
              {filtered.map(item => {
                const cfg = TYPE_CONFIG[item.itemType] || { icon: '📌', label: item.itemType, href: '/' }
                return (
                  <Link key={item.id} href={`${cfg.href}/${item.itemId}`} className={styles.card}>
                    <div className={styles.cardIcon}>{cfg.icon}</div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>{item.title || 'Untitled'}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.badge}>{cfg.label}</span>
                        <span className={styles.dot}>·</span>
                        <span>Saved {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button type="button" className={styles.removeBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); unsave(item.id) }} title="Remove">
                      ✕
                    </button>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
