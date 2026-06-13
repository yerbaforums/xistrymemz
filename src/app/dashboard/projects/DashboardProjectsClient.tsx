'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/context/ToastContext'
import styles from './projects.module.css'

import { EmptyState } from '@/components/EmptyState'
import Button from '@/components/ui/Button'

interface ProjectData {
  id: string
  title: string
  description: string | null
  category: string | null
  goals: string | null
  resources: string | null
  needsVolunteers: boolean
  lookingForCollaborators: boolean
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
  initialProjects: ProjectData[]
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  DRAFT: { icon: '📝', label: 'Draft', color: '#f59e0b' },
  ACTIVE: { icon: '🚀', label: 'Active', color: '#00d9ff' },
  COMPLETED: { icon: '✅', label: 'Completed', color: '#10b981' },
  ARCHIVED: { icon: '📦', label: 'Archived', color: '#6b7280' }
}

const CATEGORIES = [
  'TECHNOLOGY', 'CREATIVE', 'EDUCATION', 'ENVIRONMENT', 'NATURE',
  'GARDENING', 'COMMUNITY', 'SCIENCE', 'MUSIC', 'FOOD', 'TRAVEL',
  'FASHION', 'PHOTOGRAPHY', 'WRITING', 'GAMING', 'PETS', 'DIY',
  'HEALTH', 'SOCIAL', 'BUSINESS', 'SPORTS', 'ENTERTAINMENT', 'OTHER'
]

const CATEGORY_COLORS: Record<string, string> = {
  TECHNOLOGY: '#00d9ff', CREATIVE: '#ff3366', EDUCATION: '#00ff88',
  ENVIRONMENT: '#22c55e', NATURE: '#16a34a', GARDENING: '#65a30d',
  COMMUNITY: '#f59e0b', SCIENCE: '#8b5cf6', MUSIC: '#ec4899',
  FOOD: '#f97316', TRAVEL: '#14b8a6', FASHION: '#e879f9',
  PHOTOGRAPHY: '#a855f7', WRITING: '#3b82f6', GAMING: '#7c3aed',
  PETS: '#d97706', DIY: '#eab308', HEALTH: '#ef4444',
  SOCIAL: '#f59e0b', BUSINESS: '#8b5cf6', SPORTS: '#f97316',
  ENTERTAINMENT: '#ec4899', OTHER: '#888888'
}

const CATEGORY_ICONS: Record<string, string> = {
  TECHNOLOGY: '💻', CREATIVE: '🎨', EDUCATION: '📚', ENVIRONMENT: '🌿',
  NATURE: '🌲', GARDENING: '🌱', COMMUNITY: '🏘️', SCIENCE: '🔬',
  MUSIC: '🎵', FOOD: '🍽️', TRAVEL: '✈️', FASHION: '👗',
  PHOTOGRAPHY: '📷', WRITING: '✍️', GAMING: '🎮', PETS: '🐾',
  DIY: '🛠️', HEALTH: '❤️',
  SOCIAL: '🤝', BUSINESS: '💼', SPORTS: '⚽',
  ENTERTAINMENT: '🎭', OTHER: '📌'
}

type SortOption = 'custom' | 'newest' | 'oldest' | 'mostActive' | 'mostPopular'
type ViewMode = 'grid' | 'list'

export default function DashboardProjectsClient({ initialProjects }: DashboardProjectsClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const [projects, setProjects] = useState(initialProjects)
  const [orderedIds, setOrderedIds] = useState<string[]>(() => projects.map(p => p.id))
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newGoals, setNewGoals] = useState('')
  const [newMileposts, setNewMileposts] = useState('')
  const [creating, setCreating] = useState(false)

  const dragStart = (i: number) => { dragItem.current = i }
  const dragEnter = (i: number) => { dragOverItem.current = i }
  const dragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) { dragItem.current = null; dragOverItem.current = null; return }
    const newIds = [...orderedIds]
    const [removed] = newIds.splice(dragItem.current, 1)
    newIds.splice(dragOverItem.current, 0, removed)
    setOrderedIds(newIds)
    dragItem.current = null
    dragOverItem.current = null
  }

  const filteredProjects = useMemo(() => {
    let result = [...projects]

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

    if (sortBy === 'custom' && orderedIds.length > 0) {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
      result.sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999))
    } else {
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
    }

    return result
  }, [projects, searchQuery, statusFilter, categoryFilter, sortBy, orderedIds])

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

  const { success: toastSuccess, error: toastError } = useToast()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const goalItems = newGoals.split('\n').map(l => l.trim()).filter(Boolean).map((text, i) => ({ id: `cg_${i}`, text, order: i, status: 'active' as const }))
      const milestoneItems = newMileposts.split('\n').map(l => l.trim()).filter(Boolean).map((title, i) => ({ id: `cm_${i}`, title, order: i, completed: false }))
      const res = await fetch('/a...projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc || null, goals: JSON.stringify(goalItems), mileposts: JSON.stringify(milestoneItems) })
      })
      if (res.ok) {
        const created = await res.json()
        const newProject: ProjectData = { id: created.id, title: created.title, description: created.description, category: null, goals: created.goals, resources: null, needsVolunteers: false, lookingForCollaborators: false, status: created.status, published: false, pinned: false, location: null, createdAt: created.createdAt, updatedAt: created.updatedAt, requestCount: 0, joinerCount: 0, user: { id: '', name: 'You', image: null }, events: [] }
        setProjects(prev => [newProject, ...prev])
        setShowCreateModal(false)
        setNewTitle(''); setNewDesc(''); setNewGoals(''); setNewMileposts('')
        toastSuccess('Project created!')
      } else toastError('Failed to create')
    } catch { toastError('Failed to create') }
    finally { setCreating(false) }
  }

  const statusCounts = {
    ALL: projects.length,
    DRAFT: initialProjects.filter(p => p.status === 'DRAFT').length,
    ACTIVE: initialProjects.filter(p => p.status === 'ACTIVE').length,
    COMPLETED: initialProjects.filter(p => p.status === 'COMPLETED').length,
    ARCHIVED: initialProjects.filter(p => p.status === 'ARCHIVED').length
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Projects</h1>
          <p className={styles.subtitle}>Manage your projects and collaborations</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/projects" ><Button variant="secondary">Explore Projects</Button></Link>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">+ New Project</Button>
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
              <Button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
              >
                {config ? config.icon : '🌟'} {f === 'ALL' ? 'All' : config?.label || f} ({statusCounts[f]})
              </Button>
            )
          })}
        </div>
        <div className={styles.filterDropdowns}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
            <option value="ALL">🌟 All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_ICONS[cat] || '📌'} {cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className={styles.filterSelect}>
            <option value="custom">🖐️ Custom Order</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostActive">Most Active</option>
            <option value="mostPopular">Most Popular</option>
          </select>
          <div className={styles.viewToggle}>
            <Button
              className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.activeView : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞ Grid
            </Button>
            <Button
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.activeView : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰ List
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
        {searchQuery && ` matching "${searchQuery}"`}
        {statusFilter !== 'ALL' && ` (${statusFilter.toLowerCase()})`}
      </div>

      {filteredProjects.length === 0 ? (
        <EmptyState icon="📋" title="No projects found" description="Try adjusting your search or filters, or create a new project." action={{ label: 'Create Project', onClick: () => setShowCreateModal(true) }} />
      ) : viewMode === 'grid' ? (
        <div className={styles.cardGrid}>
          {filteredProjects.map((project, index) => {
            const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
            return (
              <div
                key={plan.id}
                className={`${styles.card} ${plan.pinned ? styles.pinnedCard : ''}`}
                draggable={sortBy === 'custom'}
                onDragStart={() => dragStart(index)}
                onDragEnter={() => dragEnter(index)}
                onDragEnd={dragEnd}
                onDragOver={(e) => e.preventDefault()}
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
                    {plan.category && <span className={styles.categoryBadge} style={{ borderColor: (CATEGORY_COLORS[plan.category] || '#888') + '40', color: CATEGORY_COLORS[plan.category] || '#888', background: (CATEGORY_COLORS[plan.category] || '#888') + '20' }}>{CATEGORY_ICONS[plan.category] || '📌'} {plan.category.charAt(0) + plan.category.slice(1).toLowerCase()}</span>}
                    {plan.needsVolunteers && <span className={styles.dashVolunteerBadge}>🤝</span>}
                    {plan.lookingForCollaborators && <span className={styles.dashCollabBadge}>👥</span>}
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

                <Link href={`/projects/${plan.id}`} className={styles.cardTitle}>{plan.title}</Link>

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

                {plan.resources && (() => {
                  try {
                    const resources = JSON.parse(plan.resources)
                    if (!Array.isArray(resources) || resources.length === 0) return null
                    return (
                      <div className={styles.resources}>
                        <strong>Resources</strong>
                        <div className={styles.resourceList}>
                          {resources.slice(0, 4).map((r: any, i: number) => (
                            <a key={i} href={r.url || '#'} target="_blank" rel="noopener noreferrer" className={styles.resourceItem}>
                              {r.type === 'DOC' ? '📄' : r.type === 'CHECKLIST' ? '✅' : r.type === 'REFERENCE' ? '📚' : r.type === 'FILE' ? '📎' : '🔗'}
                              {r.title || 'Resource'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  } catch { return null }
                })()}

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

                <Link href={`/projects/${plan.id}`} className={styles.viewProjectBtn}>
                  Open Project →
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className={styles.listView}>
          {filteredProjects.map(project => {
            const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT
            return (
              <Link key={plan.id} href={`/projects/${plan.id}`} className={styles.listItem}>
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

      {showCreateModal && (
        <div className={styles.overlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Create New Project</h2>
              <Button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>✕</Button>
            </div>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Project Title *</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g., Launch my online store" required />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What is this project about?" rows={3} />
              </div>
              <div className={styles.formGroup}>
                <label>Goals (one per line)</label>
                <textarea value={newGoals} onChange={e => setNewGoals(e.target.value)} placeholder="What do you want to achieve?" rows={3} />
              </div>
              <div className={styles.formGroup}>
                <label>Milestones (one per line)</label>
                <textarea value={newMileposts} onChange={e => setNewMileposts(e.target.value)} placeholder="Key milestones..." rows={3} />
              </div>
              <div className={styles.modalActions}>
                <Button type="button" onClick={() => setShowCreateModal(false)} variant="ghost">Cancel</Button>
                <Button type="submit" disabled={!newTitle.trim() || creating} variant="primary">
                  {creating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}