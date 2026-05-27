'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Skeleton, { SkeletonCard } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import styles from './page.module.css'

interface SearchResult {
  id: string
  title: string
  type: string
  url: string
}

interface SearchResults {
  plans: SearchResult[]
  products: SearchResult[]
  services: SearchResult[]
  users: SearchResult[]
  groups: SearchResult[]
  events: SearchResult[]
  requests: SearchResult[]
  hashtags: { tag: string; postCount: number; type: string; url: string }[]
  schoolContent: SearchResult[]
}

export default function SearchResultsClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchInput, setSearchInput] = useState(query)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`)
    }
  }

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(query)}&limit=50`)
      .then(res => res.json())
      .then(data => {
        setResults(data.results)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [query])

  const filteredResults = () => {
    if (!results) return []
    if (filter === 'all') {
      return [
        ...results.plans.map(r => ({ ...r, section: '🚀 Projects' })),
        ...results.products.map(r => ({ ...r, section: '🛒 Products' })),
        ...results.services.map(r => ({ ...r, section: '🔧 Services' })),
        ...results.users.map(r => ({ ...r, section: '👤 Users', title: r.title || 'Unknown' })),
        ...results.groups.map(r => ({ ...r, section: '👥 Groups' })),
        ...results.events.map(r => ({ ...r, section: '📅 Events' })),
        ...results.requests.map(r => ({ ...r, section: '📝 Requests' })),
        ...(results.hashtags || []).map(h => ({ id: h.tag, title: `#${h.tag} (${h.postCount} posts)`, type: 'hashtag', url: h.url, section: '# Hashtags' })),
        ...results.schoolContent.map(r => ({ ...r, section: '🎓 School' })),
      ]
    }
    if (filter === 'hashtags') {
      return (results.hashtags || []).map(h => ({
        id: h.tag, title: `#${h.tag} (${h.postCount} posts)`, type: 'hashtag', url: h.url, section: '# Hashtags'
      }))
    }
    const sectionMap: Record<string, string> = {
      plans: '🚀 Projects',
      products: '🛒 Products',
      services: '🔧 Services',
      users: '👤 Users',
      groups: '👥 Groups',
      events: '📅 Events',
      requests: '📝 Requests',
      schoolContent: '🎓 School',
    }
    return ((results[filter as keyof SearchResults] || []) as SearchResult[]).map(r => ({
      ...r,
      section: sectionMap[filter] || '',
      title: filter === 'users' ? (r.title || 'Unknown') : r.title,
    }))
  }

  const filteredItems = filteredResults()

  const totalCount = results ? Object.values(results).flat().length : 0

  const categories = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'plans', label: 'Projects', count: results?.plans?.length || 0 },
    { key: 'products', label: 'Products', count: results?.products?.length || 0 },
    { key: 'services', label: 'Services', count: results?.services?.length || 0 },
    { key: 'users', label: 'Users', count: results?.users?.length || 0 },
    { key: 'groups', label: 'Groups', count: results?.groups?.length || 0 },
    { key: 'events', label: 'Events', count: results?.events?.length || 0 },
    { key: 'hashtags', label: 'Hashtags', count: results?.hashtags?.length || 0 },
    { key: 'requests', label: 'Requests', count: results?.requests?.length || 0 },
    { key: 'schoolContent', label: 'School', count: results?.schoolContent?.length || 0 },
  ].filter(c => c.count > 0 || c.key === 'all')

  let currentSection = ''

  return (
    <div className={styles.page}>
      <form onSubmit={handleSearch} className={styles.searchBar}>
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search projects, products, services, hashtags..."
          className={styles.searchInput}
          autoFocus
        />
        <button type="submit" className={styles.searchBtn}>Search</button>
      </form>

      <div className={styles.header}>
        <h1>Search Results</h1>
        <p className={styles.subtitle}>
          {loading ? 'Searching...' : `${filteredItems.length} results for "${query}"`}
        </p>
      </div>

      {categories.length > 1 && (
        <div className={styles.filterBar}>
          {categories.map(cat => (
            <button
              key={cat.key}
              className={`${styles.filterBtn} ${filter === cat.key ? styles.active : ''}`}
              onClick={() => setFilter(cat.key)}
            >
              {cat.label} <span className={styles.filterCount}>{cat.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className={styles.loading}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No results found"
          description="Try a different search term"
        />
      )}

      {!loading && filteredItems.length > 0 && (
        <div className={styles.results}>
          {filteredItems.map(item => {
            const showSection = filter === 'all' && item.section !== currentSection
            if (showSection) currentSection = item.section

            return (
              <div key={item.id}>
                {showSection && (
                  <h2 className={styles.sectionTitle}>{item.section}</h2>
                )}
                <Link href={item.url} className={styles.resultCard}>
                  <span className={styles.resultTitle}>{item.title}</span>
                  <span className={styles.resultType}>{item.type}</span>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}