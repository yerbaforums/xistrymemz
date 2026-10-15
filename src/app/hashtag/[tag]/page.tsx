'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import FeedItem from '@/components/FeedItem'
import ProductCard from '@/components/ProductCard'
import ServiceCard from '@/components/ServiceCard'
import SafeImage from '@/components/SafeImage'
import Button from '@/components/ui/Button'
import type { Product } from '@/types/product'
import type { ServiceOffering } from '@/types/service'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Breadcrumbs from '@/components/Breadcrumbs'
import { humanizeEnum } from '@/lib/utils'
import { REQUEST_CATEGORY_MAP } from '@/lib/request-categories'
import { GROUP_CATEGORY_MAP } from '@/lib/shop-categories'
import { getProjectStatusIcon, getProjectStatusLabel } from '@/lib/project-status'
import styles from './page.module.css'

type TabType = 'all' | 'posts' | 'products' | 'events' | 'services' | 'schoolContents' | 'projects' | 'requests' | 'groups' | 'blogPosts' | 'forumPosts' | 'groupPosts'

interface Totals {
  posts: number
  products: number
  events: number
  services: number
  schoolContents: number
  projects: number
  requests: number
  groups: number
  forumPosts: number
  groupPosts: number
  blogPosts: number
}

interface TagPost {
  id: string
  content: string
  images: string | null
  likes?: number
  liked?: boolean
  replyCount?: number
  userId?: string
  createdAt: string
  user?: { id: string; name: string | null; image: string | null; username?: string | null } | null
  sourceType?: 'POST' | 'GROUPPOST' | 'FORUMPOST'
  _sourceType?: string
  context?: string | null
  groupName?: string
  groupId?: string
  referenceType?: string | null
  referenceId?: string | null
  referenceTitle?: string | null
  viewCount?: number
  repostCount?: number
  reposted?: boolean
}

interface TagEvent {
  id: string
  title: string
  eventDate?: string | null
  location?: string | null
  description?: string | null
  _count?: { eventJoiners?: number }
  organizer?: { name?: string | null } | null
}

interface TagSchoolContent {
  id: string
  slug: string
  contentType?: string
  isPaid?: boolean
  price?: number | null
  title: string
  content?: string | null
  author?: { name?: string | null } | null
  user?: { schoolSlug?: string | null; schoolName?: string | null } | null
}

interface TagProject {
  id: string
  title: string
  description?: string | null
  status?: string
  _count?: { requests?: number; joiners?: number }
  user?: { name?: string | null } | null
}

interface TagRequest {
  id: string
  title: string
  description?: string | null
  status?: string
  category?: string
  _count?: { comments?: number }
  user?: { name?: string | null } | null
}

interface TagBlogPost {
  id: string
  slug: string
  title: string
  excerpt?: string | null
  coverImage?: string | null
  publishedAt?: string | null
  visibility?: string | null
  price?: number | null
  currency?: string | null
  blog?: { blogSlug?: string | null; blogName?: string | null; name?: string | null } | null
}

interface TagGroup {
  id: string
  name: string
  description?: string | null
  category?: string
  imageUrl?: string | null
  isPrivate?: boolean
  _count?: { members?: number; posts?: number }
  user?: { name?: string | null } | null
}

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '🏷️' },
  { key: 'posts', label: 'Posts', icon: '📝' },
  { key: 'products', label: 'Products', icon: '🛍️' },
  { key: 'events', label: 'Events', icon: '📅' },
  { key: 'services', label: 'Services', icon: '🔧' },
  { key: 'schoolContents', label: 'School', icon: '🎓' },
  { key: 'projects', label: 'Projects', icon: '📋' },
  { key: 'requests', label: 'Requests', icon: '🙋' },
  { key: 'groups', label: 'Groups', icon: '👥' },
  { key: 'blogPosts', label: 'Blog', icon: '✍️' },
  { key: 'forumPosts', label: 'Forum', icon: '💬' },
  { key: 'groupPosts', label: 'Group Posts', icon: '📝' },
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
  const [posts, setPosts] = useState<TagPost[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [events, setEvents] = useState<TagEvent[]>([])
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [schoolContents, setSchoolContents] = useState<TagSchoolContent[]>([])
  const [projects, setProjects] = useState<TagProject[]>([])
  const [requests, setRequests] = useState<TagRequest[]>([])
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [blogPosts, setBlogPosts] = useState<TagBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState<Record<string, boolean>>({})
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    if (!tag) return
    setLoading(true)
    setPage(1)
    fetch(`/api/hashtags/${encodeURIComponent(tag)}?type=${activeTab}`)
      .then(r => r.json())
      .then(res => {
        setTotals(res.totals || null)
        setPosts(res.data?.posts || [])
        setProducts(res.data?.products || [])
        setEvents(res.data?.events || [])
        setServices(res.data?.services || [])
        setSchoolContents(res.data?.schoolContents || [])
        setProjects(res.data?.projects || [])
        setRequests(res.data?.requests || [])
        setGroups(res.data?.groups || [])
        setBlogPosts(res.data?.blogPosts || [])
        // Dedicated forum/group tabs return their own shapes; fold them
        // into posts with source markers so the grouped section renders.
        if (Array.isArray(res.data?.forumPosts)) {
          setPosts(res.data.forumPosts.map((p: TagPost) => ({ ...p, _sourceType: 'FORUMPOST' })))
        }
        if (Array.isArray(res.data?.groupPosts)) {
          setPosts(res.data.groupPosts.map((p: TagPost) => ({ ...p, _sourceType: 'GROUPPOST' })))
        }
        // Full pages (default limit 20) imply more may exist.
        const full = (arr: unknown[]) => arr.length >= 20
        setHasMore({
          posts: full(res.data?.posts || []),
          products: full(res.data?.products || []),
          events: full(res.data?.events || []),
          services: full(res.data?.services || []),
          schoolContents: full(res.data?.schoolContents || []),
          projects: full(res.data?.projects || []),
          requests: full(res.data?.requests || []),
          groups: full(res.data?.groups || []),
          blogPosts: full(res.data?.blogPosts || []),
        })
      })
      .catch(() => {
        setTotals(null)
        setPosts([])
        setProducts([])
        setEvents([])
        setServices([])
        setSchoolContents([])
        setProjects([])
        setRequests([])
        setGroups([])
        setBlogPosts([])
      })
      .finally(() => setLoading(false))
  }, [tag, activeTab])

  const totalCount = totals
    ? totals.posts + totals.products + totals.events + totals.services +
      totals.schoolContents + totals.projects + totals.requests + totals.groups +
      totals.forumPosts + totals.groupPosts + (totals.blogPosts || 0)
    : 0

  const loadMore = () => {
    if (loadingMore || !tag || activeTab === 'all') return
    const next = page + 1
    setLoadingMore(true)
    fetch(`/api/hashtags/${encodeURIComponent(tag)}?type=${activeTab}&page=${next}`)
      .then(r => r.json())
      .then(res => {
        const append = <T,>(setter: (updater: (prev: T[]) => T[]) => void, items: T[]) =>
          setter(prev => [...prev, ...items])
        if (activeTab === 'posts') append(setPosts, res.data?.posts || [])
        else if (activeTab === 'products') append(setProducts, res.data?.products || [])
        else if (activeTab === 'events') append(setEvents, res.data?.events || [])
        else if (activeTab === 'services') append(setServices, res.data?.services || [])
        else if (activeTab === 'schoolContents') append(setSchoolContents, res.data?.schoolContents || [])
        else if (activeTab === 'projects') append(setProjects, res.data?.projects || [])
        else if (activeTab === 'requests') append(setRequests, res.data?.requests || [])
        else if (activeTab === 'groups') append(setGroups, res.data?.groups || [])
        else if (activeTab === 'blogPosts') append(setBlogPosts, res.data?.blogPosts || [])
        else if (activeTab === 'forumPosts') append(setPosts, (res.data?.forumPosts || []).map((p: TagPost) => ({ ...p, _sourceType: 'FORUMPOST' })))
        else if (activeTab === 'groupPosts') append(setPosts, (res.data?.groupPosts || []).map((p: TagPost) => ({ ...p, _sourceType: 'GROUPPOST' })))
        // A short page means exhausted.
        const got =
          activeTab === 'posts' ? (res.data?.posts || []).length :
          activeTab === 'products' ? (res.data?.products || []).length :
          activeTab === 'events' ? (res.data?.events || []).length :
          activeTab === 'services' ? (res.data?.services || []).length :
          activeTab === 'schoolContents' ? (res.data?.schoolContents || []).length :
          activeTab === 'projects' ? (res.data?.projects || []).length :
          activeTab === 'requests' ? (res.data?.requests || []).length :
          activeTab === 'groups' ? (res.data?.groups || []).length :
          activeTab === 'blogPosts' ? (res.data?.blogPosts || []).length :
          activeTab === 'forumPosts' ? (res.data?.forumPosts || []).length :
          (res.data?.groupPosts || []).length
        if (got < 20) setHasMore(prev => ({ ...prev, [activeTab]: false }))
        setPage(next)
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false))
  }

  const showProducts = activeTab === 'all' || activeTab === 'products'
  const showEvents = activeTab === 'all' || activeTab === 'events'
  const showServices = activeTab === 'all' || activeTab === 'services'
  const showSchoolContents = activeTab === 'all' || activeTab === 'schoolContents'
  const showProjects = activeTab === 'all' || activeTab === 'projects'
  const showRequests = activeTab === 'all' || activeTab === 'requests'
  const showGroups = activeTab === 'all' || activeTab === 'groups'
  const showBlogPosts = activeTab === 'all' || activeTab === 'blogPosts'

  const groupedPosts = useMemo(() => {
    if (!posts.length) return []
    const groupsMap: Record<string, TagPost[]> = {}
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
            {totals.projects > 0 && ` · ${totals.projects} project${totals.projects !== 1 ? 's' : ''}`}
            {totals.requests > 0 && ` · ${totals.requests} request${totals.requests !== 1 ? 's' : ''}`}
            {totals.groups > 0 && ` · ${totals.groups} group${totals.groups !== 1 ? 's' : ''}`}
            {totals.forumPosts > 0 && ` · ${totals.forumPosts} forum post${totals.forumPosts !== 1 ? 's' : ''}`}
            {totals.groupPosts > 0 && ` · ${totals.groupPosts} group post${totals.groupPosts !== 1 ? 's' : ''}`}
            {(totals.blogPosts || 0) > 0 && ` · ${totals.blogPosts} blog post${totals.blogPosts !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <Button
            key={tab.key}
            variant="secondary"
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon} {tab.label}
            {totals && tab.key !== 'all' && (
              <span className={styles.tabCount}>
                {totals[tab.key as keyof Totals] || 0}
              </span>
            )}
          </Button>
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
                {products.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {activeTab === 'all' && totals && totals.products > products.length && (
                <div className={styles.viewAllRow}>
                  <Button variant="ghost" onClick={() => setActiveTab('products')} className={styles.viewAllBtn}>
                    View all {totals.products} products →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showEvents && events.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Events</h2>}
              <div className={styles.eventList}>
                {events.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className={styles.eventCard}>
                    <div className={styles.eventCardBody}>
                      <h3 className={styles.eventCardTitle}>{event.title}</h3>
                      {event.eventDate && (
                        <p className={styles.eventCardDate}>
                          📅 {new Date(event.eventDate).toLocaleDateString(undefined, {
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
                  <Button variant="ghost" onClick={() => setActiveTab('events')} className={styles.viewAllBtn}>
                    View all {totals.events} events →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showServices && services.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Services</h2>}
              <div className={styles.serviceGrid}>
                {services.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
              {activeTab === 'all' && totals && totals.services > services.length && (
                <div className={styles.viewAllRow}>
                  <Button variant="ghost" onClick={() => setActiveTab('services')} className={styles.viewAllBtn}>
                    View all {totals.services} services →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showSchoolContents && schoolContents.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>School Content</h2>}
              <div className={styles.schoolContentList}>
                {schoolContents.map(item => {
                  // Lessons live at /school/[schoolSlug]/content/[id]; without
                  // a school slug there is no valid target, so render the card
                  // without a link instead of a 404.
                  const href = item.user?.schoolSlug
                    ? `/school/${item.user.schoolSlug}/content/${item.id}`
                    : null
                  const card = (
                    <>
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
                        {item.content?.slice(0, 120)}{(item.content?.length ?? 0) > 120 ? '...' : ''}
                      </p>
                    </>
                  )
                  return href ? (
                    <Link key={item.id} href={href} className={styles.schoolContentCard}>
                      {card}
                    </Link>
                  ) : (
                    <div key={item.id} className={styles.schoolContentCard}>
                      {card}
                    </div>
                  )
                })}
              </div>
              {activeTab === 'all' && totals && totals.schoolContents > schoolContents.length && (
                <div className={styles.viewAllRow}>
                  <Button variant="ghost" onClick={() => setActiveTab('schoolContents')} className={styles.viewAllBtn}>
                    View all {totals.schoolContents} lessons →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showBlogPosts && blogPosts.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Blog Posts</h2>}
              <div className={styles.schoolContentList}>
                {blogPosts.map(item => {
                  const href = item.blog?.blogSlug ? `/blog/${item.blog.blogSlug}/${item.slug}` : null
                  const access = item.visibility === 'PAID' && (item.price || 0) > 0
                    ? `🔒 $${item.price}${item.currency && item.currency !== 'USD' ? ` ${item.currency}` : ''}`
                    : item.visibility === 'SUBSCRIBERS'
                      ? '🔒 Subscribers'
                      : 'Free'
                  const card = (
                    <>
                      <div className={styles.schoolContentHeader}>
                        <span className={styles.schoolContentType}>✍️ Article</span>
                        <span className={styles.schoolContentFree}>{access}</span>
                      </div>
                      <h3 className={styles.schoolContentTitle}>{item.title}</h3>
                      <p className={styles.schoolContentMeta}>
                        by {item.blog?.blogName || item.blog?.name || 'Unknown'}
                      </p>
                      {item.excerpt && (
                        <p className={styles.schoolContentDesc}>
                          {item.excerpt.slice(0, 120)}{item.excerpt.length > 120 ? '...' : ''}
                        </p>
                      )}
                    </>
                  )
                  return href ? (
                    <Link key={item.id} href={href} className={styles.schoolContentCard}>
                      {card}
                    </Link>
                  ) : (
                    <div key={item.id} className={styles.schoolContentCard}>
                      {card}
                    </div>
                  )
                })}
              </div>
              {activeTab === 'all' && totals && (totals.blogPosts || 0) > blogPosts.length && (
                <div className={styles.viewAllRow}>
                  <Button variant="ghost" onClick={() => setActiveTab('blogPosts')} className={styles.viewAllBtn}>
                    View all {totals.blogPosts} articles →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showProjects && projects.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Projects</h2>}
              <div className={styles.projectList}>
                {projects.map(project => (
                  <Link key={project.id} href={`/projects/${project.id}`} className={styles.projectCard}>
                    <h3 className={styles.projectCardTitle}>{project.title}</h3>
                    {project.description && (
                      <p className={styles.projectCardDesc}>{project.description.slice(0, 120)}{project.description.length > 120 ? '...' : ''}</p>
                    )}
                    <div className={styles.projectCardMeta}>
                      <span className={`badge badge-${project.status === 'COMPLETED' ? 'completed' : project.status === 'ACTIVE' ? 'active' : 'draft'}`}>
                        {getProjectStatusIcon(project.status)} {getProjectStatusLabel(project.status)}
                      </span>
                      <span>{project._count?.requests || 0} requests</span>
                      <span>{project._count?.joiners || 0} joiners</span>
                      {project.user?.name && <span>by {project.user.name}</span>}
                    </div>
                  </Link>
                ))}
              </div>
              {activeTab === 'all' && totals && totals.projects > projects.length && (
                <div className={styles.viewAllRow}>
                  <Button variant="ghost" onClick={() => setActiveTab('projects')} className={styles.viewAllBtn}>
                    View all {totals.projects} projects →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showRequests && requests.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Requests</h2>}
              <div className={styles.requestList}>
                {requests.map(req => (
                  <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestCard}>
                    <div className={styles.requestCardHeader}>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-completed' : req.status === 'REJECTED' ? 'badge-archived' : 'badge-active'}`}>
                        {humanizeEnum(req.status)}
                      </span>
                      <span className={styles.requestCategory}>{REQUEST_CATEGORY_MAP.get(req.category || '')?.icon || '📋'} {REQUEST_CATEGORY_MAP.get(req.category || '')?.label || humanizeEnum(req.category)}</span>
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
                  <Button variant="ghost" onClick={() => setActiveTab('requests')} className={styles.viewAllBtn}>
                    View all {totals.requests} requests →
                  </Button>
                </div>
              )}
            </section>
          )}

          {showGroups && groups.length > 0 && (
            <section>
              {activeTab === 'all' && <h2 className={styles.sectionTitle}>Groups</h2>}
              <div className={styles.groupList}>
                {groups.map(group => (
                  <Link key={group.id} href={`/groups/${group.id}`} className={styles.groupCard}>
                    <div className={styles.groupCardHeader}>
                      {group.imageUrl && (
                        <SafeImage src={group.imageUrl} alt="" className={styles.groupCardImage} />
                      )}
                      <div>
                        <h3 className={styles.groupCardName}>{group.name}</h3>
                        <span className={styles.groupCardCategory}>{GROUP_CATEGORY_MAP.get(group.category || '')?.icon || '👥'} {GROUP_CATEGORY_MAP.get(group.category || '')?.label || humanizeEnum(group.category)}</span>
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
                  <Button variant="ghost" onClick={() => setActiveTab('groups')} className={styles.viewAllBtn}>
                    View all {totals.groups} groups →
                  </Button>
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

          {!loading && activeTab !== 'all' && hasMore[activeTab] && totalCount > 0 && (
            <div className={styles.viewAllRow}>
              <Button variant="ghost" onClick={loadMore} disabled={loadingMore} className={styles.viewAllBtn}>
                {loadingMore ? 'Loading…' : 'Load more →'}
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab !== 'products' && activeTab !== 'events' && activeTab !== 'services' &&
       activeTab !== 'schoolContents' && activeTab !== 'projects' && activeTab !== 'requests' &&
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
                  {items.map(post => {
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
