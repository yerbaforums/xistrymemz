'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'
import ProductCard from '@/components/ProductCard'
import ServiceCard from '@/components/ServiceCard'
import type { Product } from '@/types/product'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from './page.module.css'

type TabType = 'all' | 'posts' | 'products' | 'events' | 'services' | 'schoolContents' | 'plans' | 'requests' | 'groups'

interface Totals {
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

const TABS: { key: TabType; label: string; icon: string }[] = [
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

const POST_SECTION_CONFIG: Record<string, { label: string; icon: string; order: number }> = {
  post: { label: 'Wall Posts', icon: '📝', order: 0 },
  FORUMPOST: { label: 'Forum Discussions', icon: '💬', order: 1 },
  GROUPPOST: { label: 'Group Posts', icon: '👥', order: 2 },
}

function HashtagPage() {
  const params = useParams()
  const tag = typeof params.tag === 'string' ? params.tag.toLowerCase() : ''
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [totals, setTotals] = useState<Totals | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [schoolContents, setSchoolContents] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [groups, setGroups] = useState<any[]>([])
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
        setServices(res.data?.services || [])
        setSchoolContents(res.data?.schoolContents || [])
        setPlans(res.data?.plans || [])
        setRequests(res.data?.requests || [])
        setGroups(res.data?.groups || [])
      })
      .catch(() => {
        setTotals(null)
        setPosts([])
        setProducts([])
        setEvents([])
        setServices([])
        setSchoolContents([])
        setPlans([])
        setRequests([])
        setGroups([])
      })
      .finally(() => setLoading(false))
  }, [tag, activeTab])

  const totalCount = totals
    ? totals.posts + totals.products + totals.events + totals.services +
      totals.schoolContents + totals.plans + totals.requests + totals.groups +
      totals.forumPosts + totals.groupPosts
    : 0

  const showProducts = activeTab === 'all' || activeTab === 'products'
  const showEvents = activeTab === 'all' || activeTab === 'events'
  const showServices = activeTab === 'all' || activeTab === 'services'
  const showSchoolContents = activeTab === 'all' || activeTab === 'schoolContents'
  const showPlans = activeTab === 'all' || activeTab === 'plans'
  const showRequests = activeTab === 'all' || activeTab === 'requests'
  const showGroups = activeTab === 'all' || activeTab === 'groups'

  const groupedPosts = useMemo(() => {
    if (!posts.length) return []
    const groupsMap: Record<string, any[]> = {}
    for (const post of posts) {
      const key = post._sourceType || 'post'
      if (!groupsMap[key]) groupsMap[key] = []
      groupsMap[key].push(post)
    }
    return Object.entries(groupsMap)
      .map(([key, items]) => ({
        key,
        config: POST_SECTION_CONFIG[key] || { label: 'Posts', icon: '👤', order: 99 },
        items,
      }))
      .sort((a, b) => a.config.order - b.config.order)
  }, [posts])

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Hashtags', href: '/hashtags' },
        { label: `#${tag}` },
      ]} />

      <div className={styles.header}>
        <h1 className={styles.title}>#{tag}</h1>
        {totals && (
          <p className={styles.subtitle}>
            {totalCount} item{totalCount !== 1 ? 's' : ''}
            {totals.posts > 0 && ` · ${totals.posts} post${totals.posts !== 1 ? 's' : ''}`}
            {totals.products > 0 && ` · ${totals.products} product${totals.products !== 1 ? 's' : ''}`}
            {totals.events > 0 && ` · ${totals.events} event${totals.events !== 1 ? 's' : ''}`}
            {totals.services > 0 && ` · ${totals.services} service${totals.services !== 1 ? 's' : ''}`}
            {totals.schoolContents > 0 && ` · ${totals.schoolContents} lesson${totals.schoolContents !== 1 ? 's' : ''}`}
            {totals.plans > 0 && ` · ${totals.plans} plan${totals.plans !== 1 ? 's' : ''}`}
            {totals.requests > 0 && ` · ${totals.requests} request${totals.requests !== 1 ? 's' : ''}`}
            {totals.groups > 0 && ` · ${totals.groups} group${totals.groups !== 1 ? 's' : ''}`}
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
            {tab.icon} {tab.label}
            {totals && tab.key !== 'all' && (
              <span className={styles.tabCount}>
                {totals[tab.key as keyof Totals] || 0}
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

          {showServices && services.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Services</h2>}
              <div className={styles.serviceGrid}>
                {services.map((service: any) => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
              {activeTab === 'all' && totals && totals.services > services.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('services')} className={styles.viewAllBtn}>
                    View all {totals.services} services →
                  </button>
                </div>
              )}
            </section>
          )}

          {showSchoolContents && schoolContents.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>School Content</h2>}
              <div className={styles.schoolContentList}>
                {schoolContents.map((item: any) => (
                  <Link key={item.id} href={`/school/${item.user?.schoolSlug || item.slug}`} className={styles.schoolContentCard}>
                    <div className={styles.schoolContentHeader}>
                      <span className={styles.schoolContentType}>{item.contentType}</span>
                      {item.isPaid && <span className={styles.schoolContentPrice}>${item.price}</span>}
                      {!item.isPaid && <span className={styles.schoolContentFree}>Free</span>}
                    </div>
                    <h3 className={styles.schoolContentTitle}>{item.title}</h3>
                    <p className={styles.schoolContentMeta}>
                      by {item.author?.name || 'Unknown'} · {item.user?.schoolName || ''}
                    </p>
                    <p className={styles.schoolContentDesc}>
                      {item.content?.slice(0, 120)}{item.content?.length > 120 ? '...' : ''}
                    </p>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.schoolContents > schoolContents.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('schoolContents')} className={styles.viewAllBtn}>
                    View all {totals.schoolContents} lessons →
                  </button>
                </div>
              )}
            </section>
          )}

          {showPlans && plans.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Plans</h2>}
              <div className={styles.planList}>
                {plans.map((plan: any) => (
                  <Link key={plan.id} href={`/plans/${plan.id}`} className={styles.planCard}>
                    <h3 className={styles.planCardTitle}>{plan.title}</h3>
                    {plan.description && (
                      <p className={styles.planCardDesc}>{plan.description.slice(0, 120)}{plan.description.length > 120 ? '...' : ''}</p>
                    )}
                    <div className={styles.planCardMeta}>
                      <span className={`badge badge-${plan.status === 'COMPLETED' ? 'completed' : plan.status === 'ACTIVE' ? 'active' : 'draft'}`}>
                        {plan.status}
                      </span>
                      <span>{plan._count?.requests || 0} requests</span>
                      <span>{plan._count?.joiners || 0} joiners</span>
                      {plan.user?.name && <span>by {plan.user.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.plans > plans.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('plans')} className={styles.viewAllBtn}>
                    View all {totals.plans} plans →
                  </button>
                </div>
              )}
            </section>
          )}

          {showRequests && requests.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Requests</h2>}
              <div className={styles.requestList}>
                {requests.map((req: any) => (
                  <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestCard}>
                    <div className={styles.requestCardHeader}>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-completed' : req.status === 'REJECTED' ? 'badge-archived' : 'badge-active'}`}>
                        {req.status}
                      </span>
                      <span className={styles.requestCategory}>{req.category}</span>
                    </div>
                    <h3 className={styles.requestCardTitle}>{req.title}</h3>
                    {req.description && (
                      <p className={styles.requestCardDesc}>{req.description.slice(0, 100)}{req.description.length > 100 ? '...' : ''}</p>
                    )}
                    <div className={styles.requestCardMeta}>
                      <span>{req._count?.comments || 0} comments</span>
                      {req.user?.name && <span>by {req.user.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.requests > requests.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('requests')} className={styles.viewAllBtn}>
                    View all {totals.requests} requests →
                  </button>
                </div>
              )}
            </section>
          )}

          {showGroups && groups.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Groups</h2>}
              <div className={styles.groupList}>
                {groups.map((group: any) => (
                  <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                    <div className={styles.groupCardHeader}>
                      {group.imageUrl && (
                        <img src={group.imageUrl} alt="" className={styles.groupCardImage} />
                      )}
                      <div>
                        <h3 className={styles.groupCardName}>{group.name}</h3>
                        <span className={styles.groupCardCategory}>{group.category}</span>
                      </div>
                    </div>
                    {group.description && (
                      <p className={styles.groupCardDesc}>{group.description.slice(0, 120)}{group.description.length > 120 ? '...' : ''}</p>
                    )}
                    <div className={styles.groupCardMeta}>
                      <span>{group._count?.members || 0} members</span>
                      <span>{group._count?.posts || 0} posts</span>
                      {group.isPrivate && <span className={styles.privateBadge}>🔒 Private</span>}
                      {group.user?.name && <span>by {group.user.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.groups > groups.length && (
                <div className={styles.viewAllRow}>
                  <button onClick={() => setActiveTab('groups')} className={styles.viewAllBtn}>
                    View all {totals.groups} groups →
                  </button>
                </div>
              )}
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

      {activeTab !== 'products' && activeTab !== 'events' && activeTab !== 'services' &&
       activeTab !== 'schoolContents' && activeTab !== 'plans' && activeTab !== 'requests' &&
       activeTab !== 'groups' && groupedPosts.length > 0 && (
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
    </div>
  )
}

export default function HashtagPageWrapper() {
  return <ErrorBoundary><HashtagPage /></ErrorBoundary>
}
