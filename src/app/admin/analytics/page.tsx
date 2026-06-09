'use client'

import { useEffect, useState } from 'react'
import StatsCard from '@/components/admin/StatsCard'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

interface ViewData {
  date: string
  count: number
}

interface ContentDay {
  date: string
  posts: number
  products: number
  services: number
  requests: number
}

interface AnalyticsData {
  overview: {
    totalUsers: number
    newUsers7d: number
    newUsers30d: number
    activeToday: number
    activeWeek: number
    totalPosts: number
    totalProducts: number
    totalServices: number
    totalRentals: number
    totalRequests: number
    totalViews: number
    viewsToday: number
    views7d: number
    views30d: number
    totalConnections: number
    totalGroups: number
    totalEvents: number
    totalSchools: number
  }
  usersByClass: { className: string; count: number }[]
  usersByRole: { role: string; count: number }[]
  topPosts: { id: string; content: string; likes: number; viewCount: number; createdAt: string; user: { id: string; name: string | null; image: string | null; username: string | null } }[]
  topProducts: { id: string; title: string; price: number | null; type: string; viewCount: number; user: { id: string; name: string | null } }[]
  topServices: { id: string; title: string; category: string; viewCount: number; user: { id: string; name: string | null } }[]
  topRequests: { id: string; title: string; status: string; viewCount: number; user: { id: string; name: string | null } }[]
  topUsers: { id: string; name: string | null; image: string | null; userClass: string | null; postCount: number; connectionCount: number }[]
  productCategoryCounts: { category: string; count: number }[]
  serviceCategoryCounts: { category: string; count: number }[]
  dailyViews: ViewData[]
  dailyContent: ContentDay[]
  dailyUsers: ViewData[]
  traffic: {
    visitsToday: number
    visits7d: number
    visits30d: number
    totalVisits: number
    byCountry: { country: string | null; count: number }[]
    byReferrerType: { type: string | null; count: number }[]
    topDomains: { domain: string | null; count: number }[]
    dailyVisits: ViewData[]
  }
}

interface Visit {
  id: string
  ipHash: string | null
  country: string | null
  city: string | null
  region: string | null
  latitude: number | null
  longitude: number | null
  landingPage: string | null
  referrer: string | null
  referrerDomain: string | null
  referrerType: string | null
  userAgent: string | null
  createdAt: string
  userId: string | null
  user: { id: string; name: string | null; username: string | null; image: string | null } | null
}

interface VisitsResponse {
  visits: Visit[]
  total: number
  page: number
  totalPages: number
}

const DATE_RANGES = ['24h', '7d', '30d', 'All'] as const

function SimpleBar({ items, max, color }: { items: { label: string; value: number }[]; max: number; color: string }) {
  return (
    <div>
      {items.map(item => (
        <div key={item.label} className={styles.barWrap} style={{ marginBottom: 4 }}>
          <span className={styles.barLabel}>{item.label}</span>
          <div style={{ flex: 1, background: 'var(--bg-tertiary)', borderRadius: 4, height: 20 }}>
            <div
              className={styles.bar}
              style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%`, background: color }}
            />
          </div>
          <span className={styles.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function SparkChart({ data, color, label }: { data: ViewData[]; color: string; label?: string }) {
  if (data.length === 0) return <div className={styles.empty}>No data</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div>
      <div className={styles.chart}>
        {data.map(d => (
          <div
            key={d.date}
            className={styles.chartBar}
            style={{ height: `${(d.count / max) * 100}%`, background: color, flex: 1 }}
            title={`${d.date}: ${d.count}${label ? ` ${label}` : ''}`}
          />
        ))}
      </div>
      <div className={styles.chartLabels}>
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0).map(d => (
          <span key={d.date} className={styles.chartLabel}>{d.date.slice(5)}</span>
        ))}
      </div>
    </div>
  )
}

function StackedChart({ data }: { data: ContentDay[] }) {
  if (data.length === 0) return <div className={styles.empty}>No data</div>
  const max = Math.max(...data.map(d => d.posts + d.products + d.services + d.requests), 1)
  const colors = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6']

  return (
    <div>
      <div className={styles.chart}>
        {data.map(d => {
          const total = d.posts + d.products + d.services + d.requests
          const h = (total / max) * 100
          const pPosts = (d.posts / total) * 100 || 0
          const pProducts = (d.products / total) * 100 || 0
          const pServices = (d.services / total) * 100 || 0
          return (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column-reverse', height: '100%', gap: 0 }}>
              <div style={{ height: `${h}%`, borderRadius: '3px 3px 0 0', overflow: 'hidden', position: 'relative' }}>
                {d.requests > 0 && <div style={{ height: `${pRequests(d)}%`, background: colors[3], width: '100%' }} title={`${d.date}: ${d.requests} requests`} />}
                {d.services > 0 && <div style={{ height: `${pServices}%`, background: colors[2], width: '100%' }} title={`${d.date}: ${d.services} services`} />}
                {d.products > 0 && <div style={{ height: `${pProducts}%`, background: colors[1], width: '100%' }} title={`${d.date}: ${d.products} products`} />}
                {d.posts > 0 && <div style={{ height: `${pPosts}%`, background: colors[0], width: '100%' }} title={`${d.date}: ${d.posts} posts`} />}
              </div>
            </div>
          )
        })}
      </div>
      <div className={styles.chartLabels}>
        {data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 7)) === 0).map(d => (
          <span key={d.date} className={styles.chartLabel}>{d.date.slice(5)}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colors[0], display: 'inline-block' }} /> Posts</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colors[1], display: 'inline-block' }} /> Products</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colors[2], display: 'inline-block' }} /> Services</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: colors[3], display: 'inline-block' }} /> Requests</span>
      </div>
    </div>
  )
}

function pRequests(d: ContentDay) {
  const total = d.posts + d.products + d.services + d.requests
  return total > 0 ? (d.requests / total) * 100 : 0
}

const MAX_CLASSES = 14

const REFERRER_COLORS: Record<string, string> = {
  direct: '#8B5CF6',
  search: '#10B981',
  social: '#3B82F6',
  other: '#F59E0B',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString()
}

function truncateIP(hash: string | null): string {
  if (!hash) return '—'
  return hash.slice(0, 12) + '…'
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<typeof DATE_RANGES[number]>('7d')

  const [visits, setVisits] = useState<Visit[]>([])
  const [visitsTotal, setVisitsTotal] = useState(0)
  const [visitsPage, setVisitsPage] = useState(1)
  const [visitsPages, setVisitsPages] = useState(0)
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [ipFilter, setIpFilter] = useState('')
  const [pageFilter, setPageFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')

  useEffect(() => {
    setVisitsLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(visitsPage))
    if (ipFilter) params.set('ip', ipFilter)
    if (pageFilter) params.set('pagePath', pageFilter)
    if (countryFilter) params.set('country', countryFilter)
    fetch(`/api/admin/analytics/visits?${params}`)
      .then(r => r.json())
      .then((d: VisitsResponse) => {
        setVisits(d.visits)
        setVisitsTotal(d.total)
        setVisitsPages(d.totalPages)
        setVisitsLoading(false)
      })
      .catch(() => setVisitsLoading(false))
  }, [visitsPage, ipFilter, pageFilter, countryFilter])

  useEffect(() => {
    setLoading(true)
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className={styles.page}><p>Loading analytics...</p></div>
  }

  if (!data) {
    return <div className={styles.page}><p>Failed to load analytics.</p></div>
  }

  const { overview } = data

  const filteredViews = dateRange === '24h' ? data.dailyViews.slice(-1) : dateRange === '7d' ? data.dailyViews.slice(-7) : dateRange === '30d' ? data.dailyViews : data.dailyViews
  const filteredContent = dateRange === '24h' ? data.dailyContent.slice(-1) : dateRange === '7d' ? data.dailyContent.slice(-7) : dateRange === '30d' ? data.dailyContent : data.dailyContent
  const filteredUsers = dateRange === '24h' ? data.dailyUsers.slice(-1) : dateRange === '7d' ? data.dailyUsers.slice(-7) : dateRange === '30d' ? data.dailyUsers : data.dailyUsers

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Analytics' }]} />
      <div className={styles.header}>
        <h1>📊 Admin Analytics</h1>
        <div className={styles.dateRange}>
          {DATE_RANGES.map(r => (
            <button key={r} className={`${styles.dateBtn} ${dateRange === r ? styles.dateBtnActive : ''}`} onClick={() => setDateRange(r)}>{r}</button>
          ))}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatsCard icon="👥" label="Total Users" value={overview.totalUsers} />
        <StatsCard icon="✨" label="Active Today" value={overview.activeToday} />
        <StatsCard icon="📈" label="New (7d)" value={overview.newUsers7d} />
        <StatsCard icon="📝" label="Posts" value={overview.totalPosts} />
        <StatsCard icon="🛒" label="Products" value={overview.totalProducts} />
        <StatsCard icon="🎨" label="Services" value={overview.totalServices} />
        <StatsCard icon="👁️" label="Total Views" value={overview.totalViews} />
        <StatsCard icon="📊" label="Views Today" value={overview.viewsToday} />
        <StatsCard icon="📅" label="Views (7d)" value={overview.views7d} />
        <StatsCard icon="🔗" label="Connections" value={overview.totalConnections} />
        <StatsCard icon="👥" label="Groups" value={overview.totalGroups} />
        <StatsCard icon="🏠" label="Rentals" value={overview.totalRentals} />
        <StatsCard icon="📋" label="Requests" value={overview.totalRequests} />
        <StatsCard icon="📚" label="Schools" value={overview.totalSchools} />
        <StatsCard icon="📅" label="Events" value={overview.totalEvents} />
        <StatsCard icon="🎯" label="Active (7d)" value={overview.activeWeek} />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📊 Engagement</h2>
        <div className={styles.threeCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Daily Active Users</h3>
            <SparkChart data={filteredUsers} color="#8B5CF6" label="users" />
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Daily Views</h3>
            <SparkChart data={filteredViews} color="#06B6D4" label="views" />
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Daily Content Created</h3>
            <StackedChart data={filteredContent} />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>👤 User Analytics</h2>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>By Class</h3>
            <SimpleBar
              items={data.usersByClass.map(c => ({ label: c.className, value: c.count }))}
              max={Math.max(...data.usersByClass.map(c => c.count), 1)}
              color="var(--accent-primary)"
            />
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Users by Posts</h3>
            {data.topUsers.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr><th>User</th><th>Class</th><th>Posts</th><th>Connections</th></tr>
                </thead>
                <tbody>
                  {data.topUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userRow}>
                          {u.image ? <img src={u.image} alt="" className={styles.userAvatar} /> : <div className={styles.userAvatarPlaceholder}>{(u.name || 'U')[0]}</div>}
                          <span>{u.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{u.userClass ? <span className={styles.classBadge}>{u.userClass}</span> : '—'}</td>
                      <td>{u.postCount}</td>
                      <td>{u.connectionCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No users yet</div>}
          </div>
        </div>
        <div className={styles.twoCol} style={{ marginTop: 16 }}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>By Role</h3>
            {data.usersByRole.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Role</th><th>Count</th></tr></thead>
                <tbody>
                  {data.usersByRole.map(r => (
                    <tr key={r.role}>
                      <td><span className={`${styles.roleBadge} ${r.role === 'ADMIN' ? styles.roleAdmin : styles.roleUser}`}>{r.role}</span></td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No data</div>}
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Product Categories</h3>
            <SimpleBar
              items={data.productCategoryCounts.map(c => ({ label: c.category, value: c.count }))}
              max={Math.max(...data.productCategoryCounts.map(c => c.count), 1)}
              color="#10B981"
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🌐 Traffic Sources</h2>
        <div className={styles.statsGrid}>
          <StatsCard icon="👁️" label="Visits Today" value={data.traffic.visitsToday} />
          <StatsCard icon="📈" label="Visits (7d)" value={data.traffic.visits7d} />
          <StatsCard icon="📊" label="Visits (30d)" value={data.traffic.visits30d} />
          <StatsCard icon="📋" label="All Time Visits" value={data.traffic.totalVisits} />
        </div>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Traffic Source</h3>
            {data.traffic.byReferrerType.length > 0 ? (
              <SimpleBar
                items={data.traffic.byReferrerType.map(r => ({ label: r.type || 'unknown', value: r.count }))}
                max={Math.max(...data.traffic.byReferrerType.map(r => r.count), 1)}
                color="var(--accent-primary)"
              />
            ) : <div className={styles.empty}>No traffic data yet</div>}
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Daily Visits</h3>
            <SparkChart data={data.traffic.dailyVisits} color="#8B5CF6" label="visits" />
          </div>
        </div>
        <div className={styles.twoCol} style={{ marginTop: 16 }}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Countries</h3>
            {data.traffic.byCountry.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Country</th><th>Visits</th></tr></thead>
                <tbody>
                  {data.traffic.byCountry.map(c => (
                    <tr key={c.country || 'unknown'}>
                      <td>{c.country ? <span className={styles.countryCell}>{c.country}</span> : <span className={styles.unknown}>Unknown</span>}</td>
                      <td>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No traffic data yet</div>}
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Referring Domains</h3>
            {data.traffic.topDomains.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Domain</th><th>Visits</th></tr></thead>
                <tbody>
                  {data.traffic.topDomains.map(d => (
                    <tr key={d.domain || 'unknown'}>
                      <td>{d.domain || '—'}</td>
                      <td>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No referral data yet</div>}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📦 Content Analytics</h2>
        <div className={styles.twoCol}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Viewed Posts</h3>
            {data.topPosts.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Content</th><th>Author</th><th>Likes</th><th>Views</th></tr></thead>
                <tbody>
                  {data.topPosts.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</td>
                      <td>{p.user.name || 'Unknown'}</td>
                      <td>{p.likes}</td>
                      <td>{p.viewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No posts yet</div>}
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Viewed Products</h3>
            {data.topProducts.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Title</th><th>Seller</th><th>Price</th><th>Views</th></tr></thead>
                <tbody>
                  {data.topProducts.slice(0, 10).map(p => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{p.user.name || 'Unknown'}</td>
                      <td>{p.price != null ? `$${p.price}` : 'Free'}</td>
                      <td>{p.viewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No products yet</div>}
          </div>
        </div>
        <div className={styles.twoCol} style={{ marginTop: 16 }}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Top Viewed Services</h3>
            {data.topServices.length > 0 ? (
              <table className={styles.table}>
                <thead><tr><th>Title</th><th>Provider</th><th>Category</th><th>Views</th></tr></thead>
                <tbody>
                  {data.topServices.slice(0, 10).map(s => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      <td>{s.user.name || 'Unknown'}</td>
                      <td><span className={styles.classBadge}>{s.category}</span></td>
                      <td>{s.viewCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className={styles.empty}>No services yet</div>}
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Service Categories</h3>
            <SimpleBar
              items={data.serviceCategoryCounts.map(c => ({ label: c.category, value: c.count }))}
              max={Math.max(...data.serviceCategoryCounts.map(c => c.count), 1)}
              color="#F59E0B"
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>🕵️ Recent Visits</h2>
        <div className={styles.card}>
          <div className={styles.filterBar}>
            <input className={styles.filterInput} type="text" placeholder="Filter by visitor hash..." value={ipFilter} onChange={e => { setIpFilter(e.target.value); setVisitsPage(1) }} />
            <input className={styles.filterInput} type="text" placeholder="Filter by page..." value={pageFilter} onChange={e => { setPageFilter(e.target.value); setVisitsPage(1) }} />
            <input className={styles.filterInput} type="text" placeholder="Filter by country..." value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setVisitsPage(1) }} />
          </div>
          {visitsLoading ? (
            <div className={styles.empty}>Loading visits...</div>
          ) : visits.length === 0 ? (
            <div className={styles.empty}>No visits recorded yet</div>
          ) : (
            <>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Visitor</th>
                    <th>Page</th>
                    <th>Referrer</th>
                    <th>Location</th>
                    <th>Time</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map(v => (
                    <tr key={v.id}>
                      <td><code className={styles.hashCode}>{truncateIP(v.ipHash)}</code></td>
                      <td className={styles.pageCell}>{v.landingPage || '/'}</td>
                      <td className={styles.pageCell}>{v.referrerDomain || '—'}</td>
                      <td>{[v.city, v.region, v.country].filter(Boolean).join(', ') || '—'}</td>
                      <td className={styles.timeCell}>{formatTime(v.createdAt)}</td>
                      <td>{v.user ? <span className={styles.userName}>{v.user.name || v.user.username || 'User'}</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className={styles.pagination}>
                <span className={styles.paginationInfo}>{visitsTotal} total visits</span>
                <div className={styles.paginationButtons}>
                  <button className={styles.pageBtn} disabled={visitsPage <= 1} onClick={() => setVisitsPage(p => p - 1)}>← Prev</button>
                  <span className={styles.pageIndicator}>Page {visitsPage} of {visitsPages || 1}</span>
                  <button className={styles.pageBtn} disabled={visitsPage >= visitsPages} onClick={() => setVisitsPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.spacing} />
    </div>
  )
}
