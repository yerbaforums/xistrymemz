'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Breadcrumbs from '@/components/Breadcrumbs'

interface HashtagEntityCounts {
  posts: number
  products: number
  events: number
  services: number
  schoolContents: number
  plans: number
  requests: number
  groups: number
  forumPosts: number
  groupPosts: number
}

interface HashtagItem {
  tag: string
  postCount: number
  entities: HashtagEntityCounts
}

type SortMode = 'trending' | 'alphabetical' | 'count'
type EntityFilter = 'all' | 'products' | 'events' | 'services' | 'schoolContents' | 'plans' | 'requests' | 'groups' | 'posts'

const ENTITY_FILTERS: { key: EntityFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏷️' },
  { key: 'posts', label: 'Posts', icon: '📝' },
  { key: 'products', label: 'Products', icon: '🛍️' },
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'services', label: 'Services', icon: '🔧' },
  { key: 'schoolContents', label: 'School', icon: '🎓' },
  { key: 'plans', label: 'Plans', icon: '📋' },
  { key: 'requests', label: 'Requests', icon: '🙋' },
  { key: 'groups', label: 'Groups', icon: '👥' },
]

function HashtagsPage() {
  const [tags, setTags] = useState<HashtagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('trending')
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sort === 'trending') params.set('mode', 'trending')
    if (entityFilter !== 'all') params.set('entity', entityFilter)
    params.set('limit', '100')

    fetch(`/api/hashtags?${params}`)
      .then(r => r.json())
      .then(data => {
        setTags(data.hashtags || [])
      })
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [search, sort, entityFilter])

  const sorted = [...tags].sort((a, b) => {
    if (sort === 'alphabetical') return a.tag.localeCompare(b.tag)
    if (sort === 'count') return b.postCount - a.postCount
    return 0
  })

  const totalEntities = (t: HashtagItem) =>
    Object.values(t.entities).reduce((sum, count) => sum + count, 0)

  const entityLabel = (key: string, count: number) => {
    const labels: Record<string, string> = {
      products: 'pr', events: 'ev', posts: 'po',
      services: 'sv', schoolContents: 'sc', plans: 'pl',
      requests: 'rq', groups: 'gr',
    }
    return labels[key] ? `${count}${labels[key]}` : ''
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Hashtags' },
      ]} />

      <div className={styles.header}>
        <h1 className={styles.title}>Hashtags</h1>
        <p className={styles.subtitle}>Browse trending and popular hashtags across the platform</p>
      </div>

      <div className={styles.controls}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search hashtags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className={styles.sortBtns}>
          <button
            className={`${styles.sortBtn} ${sort === 'trending' ? styles.sortActive : ''}`}
            onClick={() => setSort('trending')}
          >
            Trending
          </button>
          <button
            className={`${styles.sortBtn} ${sort === 'count' ? styles.sortActive : ''}`}
            onClick={() => setSort('count')}
          >
            Most Used
          </button>
          <button
            className={`${styles.sortBtn} ${sort === 'alphabetical' ? styles.sortActive : ''}`}
            onClick={() => setSort('alphabetical')}
          >
            A-Z
          </button>
        </div>
      </div>

      <div className={styles.entityFilters}>
        {ENTITY_FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.entityFilter} ${entityFilter === f.key ? styles.entityFilterActive : ''}`}
            onClick={() => setEntityFilter(f.key)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : sorted.length > 0 ? (
        <div className={styles.cloud}>
          {sorted.map(h => {
            const maxCount = Math.max(...sorted.map(t => t.postCount))
            const size = 0.8 + (h.postCount / maxCount) * 0.6
            return (
              <Link
                key={h.tag}
                href={`/hashtag/${h.tag}`}
                className={styles.pill}
                style={{ fontSize: `${size}rem` }}
              >
                <span className={styles.pillTag}>#{h.tag}</span>
                <span className={styles.pillCount}>{totalEntities(h)}</span>
                {Object.entries(h.entities).map(([key, count]) =>
                  count > 0 ? (
                    <span key={key} className={styles.pillEntity} title={key}>
                      {entityLabel(key, count)}
                    </span>
                  ) : null
                )}
              </Link>
            )
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏷️</div>
          <p className={styles.emptyTitle}>No hashtags found</p>
          <p className={styles.emptyDesc}>
            {search ? 'Try a different search term.' : 'No hashtags have been created yet.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function HashtagsPageWrapper() {
  return <ErrorBoundary><HashtagsPage /></ErrorBoundary>
}
