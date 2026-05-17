'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'
import ProductCard from '@/components/ProductCard'
import type { Product } from '@/types/product'
import styles from './page.module.css'

type TabType = 'all' | 'posts' | 'products' | 'events'

interface Totals {
  posts: number
  products: number
  events: number
  forumPosts: number
  groupPosts: number
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'posts', label: 'Posts' },
  { key: 'products', label: 'Products' },
  { key: 'events', label: 'Events' },
]

const POST_SECTION_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
  post: { label: 'Wall Posts', icon: '📝', order: 0 },
  FORUMPOST: { label: 'Forum Discussions', icon: '💬', order: 1 },
  GROUPPOST: { label: 'Group Posts', icon: '👥', order: 2 },
}

export default function HashtagPage() {
  const params = useParams()
  const tag = typeof params.tag === 'string' ? params.tag.toLowerCase() : ''
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [totals, setTotals] = useState<Totals | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    fetch(`/api/hashtags/${encodeURIComponent(tag)}?type=${activeTab}`)
      .then(r => r.json())
      .then(res => {
        setTotals(res.totals || null)
        setPosts(res.data?.posts || [])
        setProducts(res.data?.products || [])
        setEvents(res.data?.events || [])
      })
      .catch(() => {
        setTotals(null)
        setPosts([])
        setProducts([])
        setEvents([])
      })
      .finally(() => setLoading(false))
  }, [tag, activeTab])

  const totalCount = totals
    ? totals.posts + totals.products + totals.events + totals.forumPosts + totals.groupPosts
    : 0

  const showProducts = activeTab === 'all' || activeTab === 'products'
  const showEvents = activeTab === 'all' || activeTab === 'events'

  const groupedPosts = useMemo(() => {
    if (!posts.length) return []
    const groups: Record<string, any[]> = {}
    for (const post of posts) {
      const key = post._sourceType || 'post'
      if (!groups[key]) groups[key] = []
      groups[key].push(post)
    }
    return Object.entries(groups)
      .map(([key, items]) => ({
        key,
        config: POST_SECTION_CONFIG[key] || { label: 'Posts', icon: '👤', order: 99 },
        items,
      }))
      .sort((a, b) => a.config.order - b.config.order)
  }, [posts])

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs}>
        <Link href="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-sep"> / </span>
        <Link href="/hashtags" className="breadcrumb-link">Hashtags</Link>
        <span className="breadcrumb-sep"> / </span>
        <span className="breadcrumb-current">#{tag}</span>
      </nav>

      <div className={styles.header}>
        <h1 className={styles.title}>#{tag}</h1>
        {totals && (
          <p className={styles.subtitle}>
            {totalCount} item{totalCount !== 1 ? 's' : ''}
            {totals.posts > 0 && ` · ${totals.posts} post${totals.posts !== 1 ? 's' : ''}`}
            {totals.products > 0 && ` · ${totals.products} product${totals.products !== 1 ? 's' : ''}`}
            {totals.events > 0 && ` · ${totals.events} event${totals.events !== 1 ? 's' : ''}`}
            {totals.forumPosts > 0 && ` · ${totals.forumPosts} forum post${totals.forumPosts !== 1 ? 's' : ''}`}
            {totals.groupPosts > 0 && ` · ${totals.groupPosts} group post${totals.groupPosts !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {totals && tab.key !== 'all' && (
              <span className={styles.tabCount}>
                {totals[tab.key === 'posts' ? 'posts' : tab.key === 'products' ? 'products' : 'events'] +
                  (tab.key === 'posts' ? totals.forumPosts + totals.groupPosts : 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {[1, 2, 3].map(i => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      ) : (
        <div className={styles.content}>
          {showProducts && products.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Products</h2>}
              <div className={styles.productGrid}>
                {products.map((product: any) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {activeTab === 'all' && totals && totals.products > products.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('products')} className={styles.viewAllBtn}>
                    View all {totals.products} products →
                  </button>
                </div>
              )}
            </section>
          )}

          {showEvents && events.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Events</h2>}
              <div className={styles.eventList}>
                {events.map((event: any) => (
                  <Link key={event.id} href={`/events/${event.id}`} className={styles.eventCard}>
                    <div className={styles.eventCardBody}>
                      <h3 className={styles.eventCardTitle}>{event.title}</h3>
                      {event.eventDate && (
                        <p className={styles.eventCardDate}>
                          📅 {new Date(event.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                          })}
                        </p>
                      )}
                      {event.location && <p className={styles.eventCardLocation}>📍 {event.location}</p>}
                      {event.description && (
                        <p className={styles.eventCardDesc}>{event.description.slice(0, 120)}{event.description.length > 120 ? '...' : ''}</p>
                      )}
                    </div>
                    <div className={styles.eventCardMeta}>
                      <span>{event._count?.eventJoiners || 0} attending</span>
                      {event.organizer?.name && <span>by {event.organizer.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.events > events.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('events')} className={styles.viewAllBtn}>
                    View all {totals.events} events →
                  </button>
                </div>
              )}
            </section>
          )}

          {activeTab !== 'products' && activeTab !== 'events' && groupedPosts.length > 0 && (
            <section>
              {activeTab === 'all' && groupedPosts.length > 1 && (
                <h2 className={styles.sectionTitle}>Posts</h2>
              )}
              <div className={styles.postList}>
                {groupedPosts.map(({ key, config, items }) => (
                  <div key={key} style={{ marginBottom: '20px' }}>
                    {groupedPosts.length > 1 && (
                      <h3 style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        marginBottom: '12px',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {config.icon} {config.label}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                          ({items.length})
                        </span>
                      </h3>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {items.map((post: any) => {
                        const sourceType = key === 'FORUMPOST' ? 'FORUMPOST' : key === 'GROUPPOST' ? 'GROUPPOST' : 'POST'
                        return (
                          <FeedItem
                            key={post.id}
                            post={{
                              ...post,
                              user: post.user || { id: '', name: null, image: null },
                              sourceType,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {!loading && totalCount === 0 && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🏷️</div>
              <p className={styles.emptyTitle}>No results for #{tag}</p>
              <p className={styles.emptyDesc}>Try a different hashtag or be the first to use it!</p>
              <Link href="/hashtags" className={styles.emptyAction}>Browse Hashtags</Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
