'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface DirItem {
  id: string; title: string; image: string | null
  url: string; meta?: string; type: string
}

const TYPE_TABS = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'shop', label: 'Shops', icon: '🛍️' },
  { key: 'product', label: 'Products', icon: '📦' },
  { key: 'service', label: 'Services', icon: '🔧' },
  { key: 'rental', label: 'Rentals', icon: '🏠' },
  { key: 'event', label: 'Events', icon: '📅' },
  { key: 'plan', label: 'Plans', icon: '🚀' },
  { key: 'request', label: 'Requests', icon: '📝' },
]

export default function DirectoryPage() {
  const [items, setItems] = useState<DirItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeType !== 'all') params.set('type', activeType)
    if (query) params.set('q', query)
    fetch(`/api/directory?${params}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.items || [])
        if (data.counts) setCounts(data.counts)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [activeType, query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const TYPE_ICONS: Record<string, string> = {
    shop: '🛍️', product: '📦', service: '🔧', rental: '🏠',
    event: '📅', plan: '🚀', request: '📝'
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>📋 Directory</h1>
        <p>Browse all public entities on the platform</p>
      </div>

      <div className={styles.tabs}>
        {TYPE_TABS.map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeType === t.key ? styles.tabActive : ''}`}
            onClick={() => setActiveType(t.key)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <form className={styles.searchWrap} onSubmit={handleSearch}>
        <input
          className={styles.searchInput}
          placeholder="Search directory..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </form>

      <div className={styles.counts}>
        {Object.entries(counts).map(([key, val]) => (
          <span key={key} className={styles.countBadge}>
            {TYPE_ICONS[key] || '📌'} {key}: {val}
          </span>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.grid}>
          {items.length === 0 ? (
            <div className={styles.emptyState}>No results found.</div>
          ) : items.map((item, i) => (
            <Link key={`${item.type}-${item.id}`} href={item.url} className={styles.card} style={{ animationDelay: `${(i % 20) * 0.04}s` }}>
              <div className={styles.cardImage}>
                {item.image ? (
                  <img src={item.image} alt={item.title} />
                ) : (
                  <span>{TYPE_ICONS[item.type] || '📌'}</span>
                )}
              </div>
              <div className={styles.cardInfo}>
                <h3>{item.title}</h3>
                <div className={styles.cardMeta}>
                  {TYPE_ICONS[item.type]} {item.type}
                  {item.meta && <> · {item.meta}</>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
