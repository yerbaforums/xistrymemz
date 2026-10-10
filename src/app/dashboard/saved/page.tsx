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
  url?: string | null
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; href: string }> = {
  // Keys must match normalizeSavedType() output in /api/saved (PLAN is
  // stored as PROJECT, FORUMPOST as FORUM_POST) — otherwise the card
  // falls back to the raw key as label and a broken `//id` link.
  PROJECT: { icon: '🚀', label: 'Project', href: '/projects' },
  PRODUCT: { icon: '🛒', label: 'Product', href: '/products' },
  SERVICE: { icon: '🔧', label: 'Service', href: '/services' },
  RENTAL: { icon: '🏠', label: 'Rental', href: '/rentals' },
  REQUEST: { icon: '📝', label: 'Request', href: '/requests' },
  EVENT: { icon: '📅', label: 'Event', href: '/events' },
  POST: { icon: '✏️', label: 'Post', href: '/posts' },
  FORUM_POST: { icon: '💬', label: 'Forum Post', href: '/community/forum' },
  SCHOOLCONTENT: { icon: '📖', label: 'Content', href: '/school' },
  GROUP: { icon: '👥', label: 'Group', href: '/community/groups' },
  SCHOOL: { icon: '🏫', label: 'School', href: '/schools' },
  SHOP: { icon: '🏪', label: 'Shop', href: '/shops' },
  PROFILE: { icon: '👤', label: 'Member', href: '/community' },
  BOARD: { icon: '📌', label: 'Board', href: '/boards' },
  PIN: { icon: '📍', label: 'Pin', href: '/boards' },
  BLOG: { icon: '✍️', label: 'Story', href: '/blogs' },
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

  const typeLabel = (type: string) =>
    TYPE_CONFIG[type]?.label || type.charAt(0) + type.slice(1).toLowerCase()

  const counts: Record<string, number> = {}
  for (const item of saved) {
    counts[item.itemType] = (counts[item.itemType] || 0) + 1
  }

  const filtered = (managed.filter === 'all' ? saved : saved.filter(s => s.itemType === managed.filter))
    .filter(s => !managed.search || s.title?.toLowerCase().includes(managed.search.toLowerCase()) || typeLabel(s.itemType).toLowerCase().includes(managed.search.toLowerCase()))
  const typeKeys = Object.keys(counts).sort()

  const pillOptions: PillOption[] = [
    { value: 'all', label: 'All', count: saved.length },
    ...typeKeys.map(type => ({
      value: type,
      label: `${TYPE_CONFIG[type]?.icon || '📌'} ${typeLabel(type)}`,
      count: counts[type],
    })),
  ]

  const exportCSV = () => {
    downloadCSV(
      `saved-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Type', 'Title', 'Saved At'],
      filtered.map(item => [
        typeLabel(item.itemType),
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
                const cfg = TYPE_CONFIG[item.itemType]
                const known = !!cfg
                const icon = cfg?.icon || '📌'
                const label = cfg?.label || item.itemType.charAt(0) + item.itemType.slice(1).toLowerCase()
                const href = item.url || (known ? `${cfg.href}/${item.itemId}` : '/directory')
                return (
                  <Link key={item.id} href={href} className={styles.card}>
                    <div className={styles.cardIcon}>{icon}</div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>{item.title || 'Untitled'}</div>
                      <div className={styles.cardMeta}>
                        <span className={styles.badge}>{label}</span>
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
