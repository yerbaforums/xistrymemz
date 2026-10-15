'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { EmptyState } from '@/components/EmptyState'
import Skeleton from '@/components/Skeleton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { humanizeEnum } from '@/lib/utils'
import { SCHOOL_CATEGORIES, SCHOOL_CATEGORY_MAP } from '@/lib/school-categories'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import IpfsImage from '@/components/IpfsImage'

interface School {
  id: string
  schoolName: string
  schoolAbout: string | null
  schoolImage: string | null
  schoolSlug: string
  ownerName: string | null
  contentCount: number
}

interface Content {
  id: string
  title: string
  contentType: string
  category: string | null
  topic: string | null
  price: number
  isPaid: boolean
  isSubscription: boolean
  subscriptionPrice: number
  createdAt: string
  author: string | null
  school: {
    name: string | null
    slug: string
    image: string | null
  }
  purchaseCount: number
}

const CONTENT_TYPES = [
  { value: 'all', label: 'All Types', icon: '📋' },
  { value: 'article', label: 'Articles', icon: '📄' },
  { value: 'video', label: 'Videos', icon: '🎥' },
  { value: 'course', label: 'Courses', icon: '🎓' },
  { value: 'tutorial', label: 'Tutorials', icon: '📘' },
  { value: 'guide', label: 'Guides', icon: '🧭' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories', icon: '🗂️' },
  ...SCHOOL_CATEGORIES,
]

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'schools' | 'content'>('schools')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [contentType, setContentType] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')
  const [sort, setSort] = useState('recent')

  useEffect(() => {
    fetchData()
  }, [search, category, contentType, sort])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('q', search)
      if (category) params.set('category', category)
      if (contentType) params.set('type', contentType)
      if (sort) params.set('sort', sort)
      
      const res = await fetch(`/api/schools?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSchools(data.schools || [])
      setContents(data.contents || [])
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Schools' },
      ]} />
      <div className={styles.header}>
        <h1>Learning Center</h1>
        <p className={styles.subtitle}>Categorized courses and lessons with sections and progression — structured learning, not freeform posts. Writing fiction or essays? Head to <Link href="/blogs">Stories & Blogs</Link>.</p>
        <Link href="/school/setup" className={styles.createBtn}>+ Create School</Link>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${view === 'schools' ? styles.active : ''}`}
          onClick={() => setView('schools')}
        >
          🏫 Schools ({schools.length})
        </button>
        <button 
          className={`${styles.tab} ${view === 'content' ? styles.active : ''}`}
          onClick={() => setView('content')}
        >
          📚 Content ({contents.length})
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <select 
          value={category} 
          onChange={e => setCategory(e.target.value)}
          className={styles.filterSelect}
        >
          {CATEGORY_OPTIONS.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
          ))}
        </select>

        <select 
          value={contentType} 
          onChange={e => setContentType(e.target.value)}
          className={styles.filterSelect}
        >
          {CONTENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
          ))}
        </select>

        <select 
          value={sort} 
          onChange={e => setSort(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="recent">🕐 Most Recent</option>
          <option value="popular">⭐ Most Popular</option>
        </select>
      </div>

      <div className={styles.resultsHeader}>
        <span className={styles.resultsCount}>
          <strong>{view === 'schools' ? schools.length : contents.length}</strong> {view === 'schools' ? 'schools' : 'items'} found
        </span>
        <div className={styles.viewToggles}>
          <button
            className={`${styles.viewToggle} ${viewMode === 'grid' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            ▦
          </button>
          <button
            className={`${styles.viewToggle} ${viewMode === 'list' ? styles.viewToggleActive : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton width="100%" height="2rem" />
      ) : view === 'schools' ? (
        schools.length === 0 ? (
          <EmptyState icon="🏫" title="No schools found" description="Be the first to create one!" />
        ) : viewMode === 'map' ? (
          <div style={{ height: 500, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Popup><strong>Map view for schools coming soon with location data</strong></Popup>
            </MapContainer>
          </div>
        ) : (
          <div className={viewMode === 'list' ? styles.list : styles.schoolsGrid}>
            {schools.map(school => (
              <Link key={school.id} href={`/school/${school.schoolSlug}`} className={styles.schoolCard}>
                {school.schoolImage && (
                  <div className={styles.schoolImage}>
                    <IpfsImage src={school.schoolImage} alt={school.schoolName} thumbWidth={512} />
                  </div>
                )}
                <div className={styles.schoolInfo}>
                  <h2>{school.schoolName}</h2>
                  {school.schoolAbout && <p className={styles.about}>{school.schoolAbout}</p>}
                  <p className={styles.meta}>
                    by {school.ownerName || 'Unknown'} • {school.contentCount} items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        contents.length === 0 ? (
          <EmptyState icon="📚" title="No content found" description="Be the first to create content!" />
        ) : (
          <div className={viewMode === 'list' ? styles.list : styles.contentGrid}>
            {contents.map(item => (
              <Link key={item.id} href={`/school/${item.school.slug}/${item.id}`} className={styles.contentCard}>
                <div className={styles.contentHeader}>
                  <span className={`${styles.contentType} ${styles[item.contentType]}`}>
                    {humanizeEnum(item.contentType)}
                  </span>
                  <span className={styles.contentCategory}>{SCHOOL_CATEGORY_MAP.get(item.category || '')?.icon || '📚'} {SCHOOL_CATEGORY_MAP.get(item.category || '')?.label || humanizeEnum(item.category) || 'General'}</span>
                </div>
                <h3>{item.title}</h3>
                <p className={styles.contentMeta}>
                  by {item.author} in {item.school.name}
                </p>
                <div className={styles.contentFooter}>
                  <span className={styles.date}>{formatDate(item.createdAt)}</span>
                  {item.isPaid && (
                    <span className={styles.priceTag}>${item.price}</span>
                  )}
                  {item.isSubscription && (
                    <span className={styles.subTag}>${item.subscriptionPrice}/mo</span>
                  )}
                  {!item.isPaid && !item.isSubscription && (
                    <span className={styles.freeTag}>Free</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
