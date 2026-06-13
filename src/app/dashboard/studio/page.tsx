'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuickCreate } from '@/components/QuickCreateModal'
import { CONTENT_TYPE_MAP } from '@/lib/content-templates'

import styles from './studio.module.css'

interface UnifiedItem {
  id: string
  type: 'post' | 'schoolContent' | 'product' | 'project' | 'event'
  icon: string
  typeLabel: string
  title: string
  description?: string
  createdAt: string
  views?: number
  likes?: number
  status?: string
  price?: number
  href: string
}

const TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  post: { icon: '✏️', label: 'Post' },
  schoolContent: { icon: '📖', label: 'School Content' },
  product: { icon: '🛒', label: 'Product' },
  project: { icon: '🚀', label: 'Project' },
  event: { icon: '📅', label: 'Event' },
}

export default function StudioPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const quickCreate = useQuickCreate()
  const [items, setItems] = useState<UnifiedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [stats, setStats] = useState({ total: 0, totalViews: 0, totalEarnings: 0 })

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) return
    loadAll()
  }, [session, status])

  async function loadAll() {
    setLoading(true)
    try {
      const all: UnifiedItem[] = []
      const userId = session!.user.id

      // Fetch school slug first
      let schoolSlug = ''
      try {
        const schoolRes = await fetch('/api/school')
        const schoolData = await schoolRes.json()
        schoolSlug = schoolData?.schoolSlug || ''
      } catch {}

      // Parallel fetches
      const [postsRes, productsRes, projectsRes, eventsRes, schoolContentRes] = await Promise.all([
        fetch(`/api/posts?userId=${userId}&limit=50`),
        fetch(`/api/products?userId=${userId}`),
        fetch('/api/projects'),
        fetch(`/api/events?organizerId=${userId}`),
        schoolSlug ? fetch(`/api/school/${schoolSlug}/content`) : Promise.resolve(null),
      ])

      // Posts
      try {
        const postsData = await postsRes.json()
        const posts = Array.isArray(postsData) ? postsData : postsData.posts || []
        for (const p of (Array.isArray(posts) ? posts : [])) {
          all.push({
            id: `post-${p.id}`,
            type: 'post', icon: '✏️', typeLabel: 'Post',
            title: p.content ? p.content.slice(0, 100) : '(no content)',
            createdAt: p.createdAt,
            views: p.viewCount || p.views || 0,
            likes: p.likes || 0,
            href: `/posts/${p.id}`,
          })
        }
      } catch {}

      // Products
      try {
        const productsData = await productsRes.json()
        const products = Array.isArray(productsData) ? productsData : productsData.products || productsData.data || []
        for (const p of products) {
          all.push({
            id: `product-${p.id}`,
            type: 'product', icon: '🛒', typeLabel: 'Product',
            title: p.title || 'Untitled',
            createdAt: p.createdAt,
            views: p.viewCount || 0,
            price: p.price || 0,
            status: p.published ? 'published' : 'draft',
            href: `/products/${p.id}`,
          })
        }
      } catch {}

      // Plans (automatic — returns current user's plans)
      try {
        const projectsData = await projectsRes.json()
        const projects = Array.isArray(projectsData) ? projectsData : projectsData.plans || projectsData.data || []
        for (const p of projects) {
          all.push({
            id: `project-${p.id}`,
            type: 'project', icon: '🚀', typeLabel: 'Project',
            title: p.title || 'Untitled',
            createdAt: p.createdAt,
            status: p.status || 'IDEA',
            href: `/projects/${p.id}`,
          })
        }
      } catch {}

      // Events
      try {
        const eventsData = await eventsRes.json()
        const events = Array.isArray(eventsData) ? eventsData : eventsData.events || eventsData.data || []
        for (const e of events) {
          all.push({
            id: `event-${e.id}`,
            type: 'event', icon: '📅', typeLabel: 'Event',
            title: e.title || 'Untitled',
            description: e.description || '',
            createdAt: e.createdAt || e.date,
            href: `/events/${e.id}`,
          })
        }
      } catch {}

      // School content
      if (schoolContentRes && schoolSlug) {
        try {
          const scData = await schoolContentRes.json()
          const scItems = Array.isArray(scData) ? scData : scData.content || scData.data || []
          for (const c of scItems) {
            const ctIcon = CONTENT_TYPE_MAP[c.contentType]
              ? CONTENT_TYPE_MAP[c.contentType].split(' ')[0]
              : '📄'
            all.push({
              id: `school-${c.id}`,
              type: 'schoolContent',
              icon: ctIcon,
              typeLabel: c.contentType ? (CONTENT_TYPE_MAP[c.contentType] || c.contentType) : 'Content',
              title: c.title || 'Untitled',
              createdAt: c.createdAt,
              views: c.viewCount || 0,
              price: c.isPaid ? (c.price || 0) : undefined,
              status: c.isPaid ? 'paid' : 'free',
              href: `/school/${schoolSlug}/content/${c.id}`,
            })
          }
        } catch {}
      }

      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setItems(all)

      const totalViews = all.reduce((sum, i) => sum + (i.views || 0), 0)
      const totalEarnings = all.reduce((sum, i) => sum + (i.price || 0), 0)
      setStats({ total: all.length, totalViews, totalEarnings })
    } catch (e) {
      console.error('Studio load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter)
  const counts: Record<string, number> = {}
  for (const item of items) {
    counts[item.type] = (counts[item.type] || 0) + 1
  }

  if (loading) {
    return (
      <div className={styles.page}>
        
        <div className={styles.header}>
          <h1>🎨 Studio</h1>
          <p className={styles.subtitle}>Your creative hub</p>
        </div>
        <div className={styles.loadingState}>
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      
      <div className={styles.header}>
        <div>
          <h1>🎨 Studio</h1>
          <p className={styles.subtitle}>Create, manage, and track all your content</p>
        </div>
        <button onClick={() => quickCreate.open()} className={styles.createBtn}>
          ✨ Quick Create
        </button>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{stats.total}</span>
          <span className={styles.statLabel}>Total Items</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{stats.totalViews}</span>
          <span className={styles.statLabel}>Total Views</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>${stats.totalEarnings.toFixed(0)}</span>
          <span className={styles.statLabel}>Value</span>
        </div>
      </div>

      <div className={styles.filterRow}>
        <button className={`${styles.filterBtn} ${filter === 'all' ? styles.filterActive : ''}`} onClick={() => setFilter('all')}>
          All ({items.length})
        </button>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            className={`${styles.filterBtn} ${filter === key ? styles.filterActive : ''}`}
            onClick={() => setFilter(key)}
          >
            {cfg.icon} {cfg.label} ({counts[key] || 0})
          </button>
        ))}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('list')}
          >📋 List</button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
          >📐 Grid</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🎨</div>
          <h3>Nothing here yet</h3>
          <p>Create your first piece of content to get started.</p>
          <button onClick={() => quickCreate.open()} className={styles.emptyBtn}>
            ✨ Create Something
          </button>
        </div>
      ) : (
        <div className={`${styles.contentList} ${viewMode === 'grid' ? styles.contentGrid : ''}`}>
          {filtered.map(item => (
            <Link key={item.id} href={item.href} className={styles.contentItem}>
              <div className={styles.contentTypeIcon}>
                <span>{item.icon}</span>
              </div>
              <div className={styles.contentInfo}>
                <div className={styles.contentTitle}>{item.title}</div>
                <div className={styles.contentMeta}>
                  <span className={styles.metaType}>{item.typeLabel}</span>
                  <span className={styles.metaDot}>·</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.views !== undefined && item.type !== 'project' && item.type !== 'event' && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <span>👁️ {item.views}</span>
                    </>
                  )}
                  {item.price !== undefined && item.price > 0 && (
                    <>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.priceTag}>${item.price}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.contentActions}>
                {item.status && (
                  <span className={`${styles.statusBadge} ${styles[`status${item.status}`] || ''}`}>
                    {item.status}
                  </span>
                )}
                <span className={styles.arrow}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
