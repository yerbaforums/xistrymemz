'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

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
  category: string
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
  { value: 'all', label: 'All Types' },
  { value: 'article', label: 'Articles' },
  { value: 'video', label: 'Videos' },
  { value: 'course', label: 'Courses' },
  { value: 'tutorial', label: 'Tutorials' },
  { value: 'guide', label: 'Guides' },
]

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'technology', label: 'Technology' },
  { value: 'business', label: 'Business' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'programming', label: 'Programming' },
  { value: 'music', label: 'Music' },
  { value: 'art', label: 'Art' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
  { value: 'general', label: 'General' },
]

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'schools' | 'content'>('schools')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [contentType, setContentType] = useState('all')
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
      <div className={styles.header}>
        <h1>Learning Center</h1>
        <p className={styles.subtitle}>Browse schools and educational content</p>
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
          {CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <select 
          value={contentType} 
          onChange={e => setContentType(e.target.value)}
          className={styles.filterSelect}
        >
          {CONTENT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>

        <select 
          value={sort} 
          onChange={e => setSort(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="recent">Most Recent</option>
          <option value="popular">Most Popular</option>
        </select>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : view === 'schools' ? (
        schools.length === 0 ? (
          <div className={styles.empty}>
            <p>No schools found. Be the first to create one!</p>
            <Link href="/school/setup" className={styles.createBtn}>
              Create School
            </Link>
          </div>
        ) : (
          <div className={styles.schoolsGrid}>
            {schools.map(school => (
              <Link key={school.id} href={`/school/${school.schoolSlug}`} className={styles.schoolCard}>
                {school.schoolImage && (
                  <div className={styles.schoolImage}>
                    <img src={school.schoolImage} alt={school.schoolName} />
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
          <div className={styles.empty}>
            <p>No content found. Be the first to create content!</p>
            <Link href="/school/setup" className={styles.createBtn}>
              Create Content
            </Link>
          </div>
        ) : (
          <div className={styles.contentGrid}>
            {contents.map(item => (
              <Link key={item.id} href={`/school/${item.school.slug}/${item.id}`} className={styles.contentCard}>
                <div className={styles.contentHeader}>
                  <span className={`${styles.contentType} ${styles[item.contentType]}`}>
                    {item.contentType}
                  </span>
                  <span className={styles.contentCategory}>{item.category}</span>
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
