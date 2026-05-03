'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from './requests.module.css'

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  category: string
  priority: string
  budget: number | null
  deadline: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  likes: number
  reposts: number
  isPublic: boolean
  createdAt: string
  updatedAt: string
  plan: { id: string; title: string } | null
  group: { id: string; name: string } | null
  product: { id: string; title: string } | null
  schoolContent: { id: string; title: string } | null
  event: { id: string; title: string } | null
  user: { id: string; name: string | null; email: string; image: string | null }
  commentCount: number
}

interface DashboardRequestsClientProps {
  initialRequests: Request[]
  userId: string
  userRole: string
}

const STATUS_ICONS: Record<string, string> = {
  PENDING: '⏳',
  APPROVED: '✅',
  REJECTED: '❌',
  COMPLETED: '🎯'
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  URGENT: '#ef4444'
}

const CATEGORIES = [
  'GENERAL', 'HELP', 'COLLABORATION', 'SUPPORT', 'RESOURCES',
  'FEEDBACK', 'IDEA', 'PRODUCT', 'SERVICE'
]

type SortOption = 'newest' | 'oldest' | 'mostComments'

export default function DashboardRequestsClient({ initialRequests, userId, userRole }: DashboardRequestsClientProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    budget: '',
    location: '',
    isPublic: true
  })
  const [creating, setCreating] = useState(false)

  const filteredRequests = useMemo(() => {
    let result = [...requests]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      )
    }

    if (statusFilter !== 'ALL') {
      result = result.filter(r => r.status === statusFilter)
    }

    if (categoryFilter !== 'ALL') {
      result = result.filter(r => r.category === categoryFilter)
    }

    if (priorityFilter !== 'ALL') {
      result = result.filter(r => r.priority === priorityFilter)
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'mostComments':
        result.sort((a, b) => b.commentCount - a.commentCount)
        break
    }

    return result
  }, [requests, searchQuery, statusFilter, categoryFilter, priorityFilter, sortBy])

  const handleCreate = async () => {
    if (!newRequest.title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequest,
          budget: newRequest.budget ? parseFloat(newRequest.budget) : null
        })
      })
      if (res.ok) {
        const created = await res.json()
        setRequests([{ ...created, user: { id: userId, name: null, email: '', image: null }, commentCount: 0 }, ...requests])
        setShowCreate(false)
        setNewRequest({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', budget: '', location: '', isPublic: true })
      }
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/approve`, { method: 'POST' })
      if (res.ok) setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r))
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/reject`, { method: 'POST' })
      if (res.ok) setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r))
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      if (res.ok) setRequests(requests.filter(r => r.id !== id))
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const getLinkInfo = (req: Request) => {
    if (req.plan) return { type: 'Plan', label: req.plan.title, href: `/plans/${req.plan.id}`, color: '#00d9ff' }
    if (req.group) return { type: 'Group', label: req.group.name, href: `/groups/${req.group.id}`, color: '#a855f7' }
    if (req.product) return { type: 'Product', label: req.product.title, href: `/products/${req.product.id}`, color: '#22c55e' }
    if (req.schoolContent) return { type: 'School', label: req.schoolContent.title, href: `/schools`, color: '#f59e0b' }
    if (req.event) return { type: 'Event', label: req.event.title, href: `/events/${req.event.id}`, color: '#ef4444' }
    return null
  }

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

  const isAdmin = userRole === 'ADMIN'
  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    COMPLETED: requests.filter(r => r.status === 'COMPLETED').length
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Requests' }
      ]} />
      
      <div className={styles.header}>
        <div>
          <h1>My Requests</h1>
          <p className={styles.subtitle}>
            {isAdmin ? 'All requests' : 'Create and manage your requests'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/requests" className="btn-secondary">Browse All</Link>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Request</button>
        </div>
      </div>

      {showCreate && (
        <div className={styles.createForm}>
          <h3>Create New Request</h3>
          <input
            type="text"
            placeholder="Request title *"
            value={newRequest.title}
            onChange={e => setNewRequest({ ...newRequest, title: e.target.value })}
            className={styles.input}
          />
          <textarea
            placeholder="Describe what you need..."
            value={newRequest.description}
            onChange={e => setNewRequest({ ...newRequest, description: e.target.value })}
            className={styles.textarea}
            rows={3}
          />
          <div className={styles.formRow}>
            <select
              value={newRequest.category}
              onChange={e => setNewRequest({ ...newRequest, category: e.target.value })}
              className={styles.select}
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
              ))}
            </select>
            <select
              value={newRequest.priority}
              onChange={e => setNewRequest({ ...newRequest, priority: e.target.value })}
              className={styles.select}
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className={styles.formRow}>
            <input
              type="number"
              placeholder="Budget (optional)"
              value={newRequest.budget}
              onChange={e => setNewRequest({ ...newRequest, budget: e.target.value })}
              className={styles.input}
            />
            <input
              type="text"
              placeholder="Location (optional)"
              value={newRequest.location}
              onChange={e => setNewRequest({ ...newRequest, location: e.target.value })}
              className={styles.input}
            />
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={newRequest.isPublic}
              onChange={e => setNewRequest({ ...newRequest, isPublic: e.target.checked })}
            />
            Make public (visible to everyone)
          </label>
          <div className={styles.formActions}>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create Request'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.searchBar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search requests by title or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.filterPills}>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`${styles.filterBtn} ${statusFilter === f ? styles.active : ''}`}
            >
              {STATUS_ICONS[f]} {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} ({statusCounts[f]})
            </button>
          ))}
        </div>
        <div className={styles.filterDropdowns}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
            <option value="ALL">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={styles.filterSelect}>
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className={styles.filterSelect}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostComments">Most Comments</option>
          </select>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'}
        {searchQuery && ` matching "${searchQuery}"`}
        {statusFilter !== 'ALL' && ` (${statusFilter.toLowerCase()})`}
      </div>

      {filteredRequests.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No requests found</h3>
          <p>Try adjusting your search or filters, or create a new request.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Request</button>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filteredRequests.map((req, index) => {
            const isOwner = req.user.id === userId
            const link = getLinkInfo(req)
            return (
              <div
                key={req.id}
                className={styles.card}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <span className={`badge badge-${req.status.toLowerCase()}`}>
                      {STATUS_ICONS[req.status] || ''} {req.status}
                    </span>
                    <span
                      className={styles.priorityBadge}
                      style={{ backgroundColor: PRIORITY_COLORS[req.priority] + '20', color: PRIORITY_COLORS[req.priority], borderColor: PRIORITY_COLORS[req.priority] + '40' }}
                    >
                      {req.priority}
                    </span>
                    <span className={styles.categoryBadge}>{req.category}</span>
                  </div>
                  <div className={styles.cardActions}>
                    {req.status === 'PENDING' && (isAdmin || !isOwner) && (
                      <>
                        <button onClick={() => handleApprove(req.id)} className={styles.approveBtn}>Approve</button>
                        <button onClick={() => handleReject(req.id)} className={styles.rejectBtn}>Reject</button>
                      </>
                    )}
                    {isOwner && (
                      <button onClick={() => handleDelete(req.id)} className={styles.deleteBtn}>Delete</button>
                    )}
                  </div>
                </div>

                <Link href={`/requests/${req.id}`} className={styles.cardTitle}>
                  {req.title}
                </Link>

                {req.description && (
                  <p className={styles.cardDesc}>{req.description}</p>
                )}

                {link && (
                  <Link href={link.href} className={styles.linkBadge} style={{ backgroundColor: link.color + '20', color: link.color }}>
                    {link.type}: {link.label}
                  </Link>
                )}
                {!link && <span className={styles.standaloneBadge}>Standalone</span>}

                <div className={styles.cardMeta}>
                  {req.budget && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      ${req.budget}
                    </span>
                  )}
                  {req.location && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {req.location}
                    </span>
                  )}
                  <span className={styles.metaItem}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/>
                    </svg>
                    {req.commentCount}
                  </span>
                  {req.isPublic && <span className={styles.publicBadge}>🌐 Public</span>}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {req.user.image ? (
                        <Image src={req.user.image} alt={req.user.name || 'User'} fill sizes="28px" />
                      ) : (
                        <span>{(req.user.name?.[0] || req.user.email[0]).toUpperCase()}</span>
                      )}
                    </div>
                    <span className={styles.authorName}>{req.user.name || req.user.email.split('@')[0]}</span>
                  </div>
                  <span className={styles.cardDate}>{formatDate(req.createdAt)}</span>
                </div>

                <Link href={`/requests/${req.id}`} className={styles.viewDetailsBtn}>
                  View Details
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                  </svg>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}