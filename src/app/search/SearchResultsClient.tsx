'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
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
  users: SearchResult[]
  groups: SearchResult[]
  events: SearchResult[]
  requests: SearchResult[]
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
        ...results.users.map(r => ({ ...r, section: '👤 Users', title: r.title || 'Unknown' })),
        ...results.groups.map(r => ({ ...r, section: '👥 Groups' })),
        ...results.events.map(r => ({ ...r, section: '📅 Events' })),
        ...results.requests.map(r => ({ ...r, section: '📝 Requests' })),
        ...results.schoolContent.map(r => ({ ...r, section: '🎓 School' })),
      ]
    }
    return (results[filter as keyof SearchResults] || []).map(r => ({
      ...r,
      section: {
        plans: '🚀 Projects',
        products: '🛒 Products',
        users: '👤 Users',
        groups: '👥 Groups',
        events: '📅 Events',
        requests: '📝 Requests',
        schoolContent: '🎓 School',
      }[filter] || '',
      title: filter === 'users' ? (r.title || 'Unknown') : r.title,
    }))
  }

  const filteredItems = filteredResults()

  const categories = [
    { key: 'all', label: 'All', count: results ? Object.values(results).flat().length : 0 },
    { key: 'plans', label: 'Projects', count: results?.plans?.length || 0 },
    { key: 'products', label: 'Products', count: results?.products?.length || 0 },
    { key: 'users', label: 'Users', count: results?.users?.length || 0 },
    { key: 'groups', label: 'Groups', count: results?.groups?.length || 0 },
    { key: 'events', label: 'Events', count: results?.events?.length || 0 },
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
          placeholder="Search anything..."
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

      {loading && <div className={styles.loading}>Searching...</div>}

      {!loading && filteredItems.length === 0 && (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M8 11h6"/>
          </svg>
          <h3>No results found</h3>
          <p>Try a different search term</p>
        </div>
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
