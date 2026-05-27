'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import styles from './page.module.css'
import AlphabeticalIndex from '@/components/AlphabeticalIndex'
import type { IndexItem } from '@/components/AlphabeticalIndex'

interface DirItem {
  id: string; title: string; image: string | null
  url: string; meta?: string; type: string; category?: string
  extra?: string; location?: string; owner?: string
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

const TYPE_ICONS: Record<string, string> = {
  shop: '🛍️', product: '📦', service: '🔧', rental: '🏠',
  event: '📅', plan: '🚀', request: '📝'
}

const SORT_OPTIONS = [
  { key: 'title', label: 'Name' },
  { key: 'newest', label: 'Newest' },
]

export default function DirectoryPage() {
  const [items, setItems] = useState<DirItem[]>([])
  const [categories, setCategories] = useState<Record<string, string[]>>({})
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('')
  const [sortBy, setSortBy] = useState('title')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (activeType !== 'all') params.set('type', activeType)
    if (query) params.set('q', query)
    if (activeCategory) params.set('category', activeCategory)
    fetch(`/api/directory?${params}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.items || [])
        if (data.categories) setCategories(data.categories)
        if (data.counts) setCounts(data.counts)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [activeType, query, activeCategory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
  }

  const typeCategories = activeType === 'all'
    ? Object.values(categories).flat().filter((v, i, a) => a.indexOf(v) === i)
    : (categories[activeType] || [])

  const sortedItems = useMemo(() => {
    const sorted = [...items]
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [items, sortBy])

  const indexItems: IndexItem[] = sortedItems.map(item => ({
    id: `${item.type}-${item.id}`,
    label: item.title,
    sortKey: item.title,
  }))

  function renderCard(item: DirItem) {
    return (
      <Link key={`${item.type}-${item.id}`} href={item.url} className={styles.card}>
        <div className={styles.cardImage}>
          {item.image ? <img src={item.image} alt={item.title} /> : <span>{TYPE_ICONS[item.type] || '📌'}</span>}
        </div>
        <div className={styles.cardInfo}>
          <h3>{item.title}</h3>
          <div className={styles.cardTags}>
            <span className={styles.cardType}>{TYPE_ICONS[item.type]} {item.type}</span>
            {item.category && <span className={styles.cardCategory}>{item.category}</span>}
          </div>
          {item.meta && <div className={styles.cardMeta}>{item.meta}</div>}
          {item.extra && <div className={styles.cardExtra}>{item.extra}</div>}
          {item.owner && <div className={styles.cardOwner}>by {item.owner}</div>}
        </div>
      </Link>
    )
  }

  function groupItems(item: IndexItem) {
    const found = sortedItems.find(i => `${i.type}-${i.id}` === item.id)
    if (found?.category) return found.category
    return item.label[0]?.toUpperCase() || '#'
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
            onClick={() => { setActiveType(t.key); setActiveCategory('') }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <form className={styles.searchWrap} onSubmit={handleSearch}>
          <input className={styles.searchInput} placeholder="Search directory..." value={search} onChange={e => setSearch(e.target.value)} />
        </form>

        {typeCategories.length > 0 && (
          <select className={styles.filterSelect} value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
            <option value="">All categories</option>
            {typeCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>

      <div className={styles.counts}>
        {Object.entries(counts).map(([key, val]) => (
          <span key={key} className={styles.countBadge}>{TYPE_ICONS[key] || '📌'} {key}: {val}</span>
        ))}
      </div>

      {loading ? (
        <div className={styles.results}>
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState icon="📋" title="No results found" description="Try a different filter or search term" />
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={(idxItem) => {
            const found = sortedItems.find(i => `${i.type}-${i.id}` === idxItem.id)
            return found ? renderCard(found) : null
          }}
          groupBy={groupItems}
          sidebarTitle="Browse by Letter"
        />
      )}
    </div>
  )
}
