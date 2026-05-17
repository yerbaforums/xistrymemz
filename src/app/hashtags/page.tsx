'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface HashtagItem {
  tag: string
  postCount: number
  entities: {
    posts: number
    products: number
    events: number
    forumPosts: number
    groupPosts: number
  }
}

type SortMode = 'trending' | 'alphabetical' | 'count'

export default function HashtagsPage() {
  const [tags, setTags] = useState<HashtagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('trending')

  useEffect(() => {
    setLoading(true)
    const params = search
      ? `search=${encodeURIComponent(search)}&limit=100`
      : sort === 'trending'
        ? 'mode=trending&limit=100'
        : 'limit=100'
    fetch(`/api/hashtags?${params}`)
      .then(r => r.json())
      .then(data => {
        setTags(data.hashtags || [])
      })
      .catch(() => setTags([]))
      .finally(() => setLoading(false))
  }, [search, sort])

  const sorted = [...tags].sort((a, b) => {
    if (sort === 'alphabetical') return a.tag.localeCompare(b.tag)
    if (sort === 'count') return b.postCount - a.postCount
    return 0
  })

  const totalEntities = (t: HashtagItem) =>
    t.entities.posts + t.entities.products + t.entities.events + t.entities.forumPosts + t.entities.groupPosts

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">Hashtags</span>
      </nav>

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
                {h.entities.products > 0 && <span className={styles.pillEntity} title="Products">{h.entities.products}pr</span>}
                {h.entities.events > 0 && <span className={styles.pillEntity} title="Events">{h.entities.events}ev</span>}
                {h.entities.posts > 0 && <span className={styles.pillEntity} title="Posts">{h.entities.posts}po</span>}
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
