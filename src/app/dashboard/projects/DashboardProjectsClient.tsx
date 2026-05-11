'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './projects.module.css'

interface Plan {
  id: string
  title: string
  description: string | null
  category: string | null
  goals: string | null
  status: string
  published: boolean
  pinned: boolean
  location: string | null
  createdAt: string
  updatedAt: string
  requestCount: number
  joinerCount: number
  user: { id: string; name: string | null; image: string | null }
  events: { id: string; eventDate: string | null }[]
}

interface DashboardProjectsClientProps {
  initialPlans: Plan[]
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  DRAFT: { icon: '📝', label: 'Draft', color: '#f59e0b' },
  ACTIVE: { icon: '🚀', label: 'Active', color: '#00d9ff' },
  COMPLETED: { icon: '✅', label: 'Completed', color: '#10b981' },
  ARCHIVED: { icon: '📦', label: 'Archived', color: '#6b7280' }
}

const CATEGORIES = [
  'TECHNOLOGY', 'CREATIVE', 'EDUCATION', 'ENVIRONMENT',
  'SOCIAL', 'BUSINESS', 'HEALTH', 'ENTERTAINMENT', 'SPORTS', 'OTHER'
]

type SortOption = 'newest' | 'oldest' | 'mostActive' | 'mostPopular'
type ViewMode = 'grid' | 'list'

export default function DashboardProjectsClient({ initialPlans }: DashboardProjectsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const filteredPlans = useMemo(() => {
    let result = [...initialPlans]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.goals?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter)
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(p => p.category === categoryFilter)
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'mostActive':
        result.sort((a, b) => b.requestCount - a.requestCount)
        break
      case 'mostPopular':
        result.sort((a, b) => b.joinerCount - a.joinerCount)
        break
    }

    return result
  }, [initialPlans, searchQuery, statusFilter, categoryFilter, sortBy])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statusCounts = {
    ALL: initialPlans.length,
    DRAFT: initialPlans.filter(p => p.status === 'DRAFT').length,
    ACTIVE: initialPlans.filter(p => p.status === 'ACTIVE').length,
    COMPLETED: initialPlans.filter(p => p.status === 'COMPLETED').length,
    ARCHIVED: initialPlans.filter(p => p.status === 'ARCHIVED').length
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Projects</h1>
          <p className={styles.subtitle}>Manage your projects and collaborations</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/plans/public" className="btn-secondary">Explore Projects</Link>
          <Link href="/plans" className="btn-primary">+ New Project</Link>
        </div>
      </div>

      <div className={styles.searchBar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search projects by title, description, or goals..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.filterPills}>
          {(['ALL', 'DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const).map(f => {
            const config = STATUS_CONFIG[f]
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
              >
                {config ? config.icon : '🌟'} {f === 'ALL' ? 'All' : config?.label || f} ({statusCounts[f]})
              </button>
            )
          })}
        </div>
        <div className={styles.filterDropdowns}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className={styles.filterSelect}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostActive">Most Active</option>
            <option value="mostPopular">Most Popular</option>
          </select>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ Grid
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ List
            </button>
          </div>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filteredPlans.length} {filteredPlans.length === 1 ? 'project' : 'projects'}
        {searchQuery && ` matching "${searchQuery}"`}
        {statusFilter !== 'ALL' && ` (${statusFilter.toLowerCase()})`}
      </div>

      {filteredPlans.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No projects found</h3>
          <p>Try adjusting your search or filters, or create a new project.</p>
          <Link href="/plans" className="btn-primary">Create Your First Project</Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={styles.cardGrid}>
          {filteredPlans.map((plan, index) => {
            const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
            return (
              <div
                key={plan.id}
                className={`${styles.card} ${plan.pinned ? styles.pinnedCard : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {plan.pinned && (
                  <div className={styles.pinnedBanner}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                    </svg>
                    Featured
                  </div>
                )}

                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <span className={styles.statusBadge} style={{ backgroundColor: status.color + '20', color: status.color, borderColor: status.color + '40' }}>
                      {status.icon} {status.label}
                    </span>
                    {plan.category && <span className={styles.categoryBadge}>{plan.category}</span>}
                  </div>
                  <div className={styles.stats}>
                    <span className={styles.statItem} title="Requests">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                      </svg>
                      {plan.requestCount}
                    </span>
                    <span className={styles.statItem} title="Members">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      {plan.joinerCount}
                    </span>
                  </div>
                </div>

                <Link href={`/plans/${plan.id}`} className={styles.cardTitle}>{plan.title}</Link>

                {plan.description && (
                  <p className={styles.cardDesc}>{plan.description}</p>
                )}

                {plan.goals && (
                  <div className={styles.goals}>
                    <strong>Goals</strong>
                    <ul>
                      {plan.goals.split('\n').filter(g => g.trim()).slice(0, 3).map((goal, i) => (
                        <li key={i}>{goal.replace(/^[-•]\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.cardMeta}>
                  {plan.location && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {plan.location}
                    </span>
                  )}
                  {!plan.published && <span className={styles.draftBadge}>Draft</span>}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {plan.user.image ? (
                        <Image src={plan.user.image} alt={plan.user.name || 'User'} fill sizes="28px" />
                      ) : (
                        <span>{(plan.user.name?.[0] || 'U').toUpperCase()}</span>
                      )}
                    </div>
                    <span className={styles.authorName}>{plan.user.name || 'You'}</span>
                  </div>
                  <span className={styles.cardDate}>{formatDate(plan.createdAt)}</span>
                </div>

                <Link href={`/plans/${plan.id}`} className={styles.viewProjectBtn}>
                  Open Project →
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.listView}>
          {filteredPlans.map(plan => {
            const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
            return (
              <Link key={plan.id} href={`/plans/${plan.id}`} className={styles.listItem}>
                <span className={styles.statusBadge} style={{ backgroundColor: status.color + '20', color: status.color, borderColor: status.color + '40' }}>
                  {status.icon} {status.label}
                </span>
                <div className={styles.listItemInfo}>
                  <strong>{plan.title}</strong>
                  <span className={styles.listItemMeta}>
                    {plan.requestCount} requests · {plan.joinerCount} members
                    {plan.location && ` · ${plan.location}`}
                  </span>
                </div>
                <span className={styles.listItemDate}>{formatDate(plan.createdAt)}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}