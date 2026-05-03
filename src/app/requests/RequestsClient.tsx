'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './page.module.css'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { useToast } from '@/context/ToastContext'

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  category: string
  priority: string
  budget: number | null
  goalAmount: number | null
  currentFunding: number | null
  payoutAddress: string | null
  payoutCurrency: string | null
  deadline: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  likes: number
  reposts: number
  isPublic: boolean
  allowFulfillments: boolean
  createdAt: string
  plan: { id: string; title: string } | null
  group: { id: string; name: string } | null
  product: { id: string; title: string } | null
  schoolContent: { id: string; title: string } | null
  event: { id: string; title: string } | null
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    shopSlug: string | null
  }
  commentCount: number
  fulfillmentCount: number
}

interface RequestsClientProps {
  initialRequests: Request[]
  userId: string
  userRole: string
  isAuthenticated: boolean
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
  'ALL', 'FUNDING', 'GENERAL', 'HELP', 'COLLABORATION', 'SUPPORT', 'RESOURCES',
  'FEEDBACK', 'IDEA', 'PRODUCT', 'SERVICE'
]

export default function RequestsClient({ initialRequests, userId, userRole, isAuthenticated }: RequestsClientProps) {
  const { settings } = useSiteSettings()
  const { success, error: toastError, warning } = useToast()
  const [requests, setRequests] = useState(initialRequests)
  const [tab, setTab] = useState<'all' | 'mine'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [editingRequest, setEditingRequest] = useState<Request | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', budget: '', goalAmount: '', location: '', isPublic: true, allowFulfillments: true })
  const [saving, setSaving] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '', description: '', category: 'GENERAL', priority: 'MEDIUM',
    budget: '', goalAmount: '', payoutAddress: '', payoutCurrency: 'ETH',
    location: '', isPublic: true, allowFulfillments: true
  })
  const [creating, setCreating] = useState(false)

  const isAdmin = userRole === 'ADMIN'

  const filteredRequests = () => {
    let result = [...requests]

    if (tab === 'mine' && userId) {
      result = result.filter(r => r.user.id === userId || r.plan?.id && requests.find(p => p.id === r.plan?.id && p.user?.id === userId))
      result = result.filter(r => {
        if (r.user.id === userId) return true
        if (r.plan) {
          const plan = requests.find(p => p.id === r.plan?.id)
          if (plan && (plan as any).user?.id === userId) return true
        }
        return false
      })
      result = requests.filter(r => r.user.id === userId)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }

    if (statusFilter !== 'ALL') result = result.filter(r => r.status === statusFilter)
    if (categoryFilter !== 'ALL') result = result.filter(r => r.category === categoryFilter)
    if (priorityFilter !== 'ALL') result = result.filter(r => r.priority === priorityFilter)

    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'mostComments': result.sort((a, b) => b.commentCount - a.commentCount); break
      case 'mostOffers': result.sort((a, b) => b.fulfillmentCount - a.fulfillmentCount); break
    }

    return result
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

  const handleCreate = async () => {
    if (!newRequest.title.trim()) { warning('Please enter a title'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newRequest,
          budget: newRequest.budget ? parseFloat(newRequest.budget) : null,
          goalAmount: newRequest.goalAmount ? parseFloat(newRequest.goalAmount) : null,
          payoutAddress: newRequest.payoutAddress || null,
          payoutCurrency: newRequest.payoutCurrency || 'ETH'
        })
      })
      if (res.ok) {
        const created = await res.json()
        setRequests([{ ...created, user: { id: userId, name: null, email: '', image: null, shopSlug: null }, commentCount: 0, fulfillmentCount: 0 }, ...requests])
        setShowCreate(false)
        setNewRequest({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', budget: '', goalAmount: '', payoutAddress: '', payoutCurrency: 'ETH', location: '', isPublic: true, allowFulfillments: true })
        success('Request created!')
      }
    } catch (err) { console.error(err) } finally { setCreating(false) }
  }

  const handleSaveEdit = async () => {
    if (!editingRequest || !editForm.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/requests/${editingRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          category: editForm.category,
          priority: editForm.priority,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          goalAmount: editForm.goalAmount ? parseFloat(editForm.goalAmount) : null,
          location: editForm.location || null,
          isPublic: editForm.isPublic,
          allowFulfillments: editForm.allowFulfillments
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setRequests(requests.map(r => r.id === editingRequest.id ? {
          ...r, ...updated, user: r.user, commentCount: r.commentCount, fulfillmentCount: r.fulfillmentCount
        } : r))
        setEditingRequest(null)
        success('Request updated!')
      }
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/approve`, { method: 'POST' })
      if (res.ok) { setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r)); success('Approved') }
    } catch (err) { console.error(err) }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/reject`, { method: 'POST' })
      if (res.ok) { setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r)); success('Rejected') }
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      if (res.ok) { setRequests(requests.filter(r => r.id !== id)); success('Deleted') }
    } catch (err) { console.error(err) }
  }

  const copyPayout = async (addr: string) => {
    await navigator.clipboard.writeText(addr)
    success('Copied!')
  }

  const filtered = filteredRequests()
  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    COMPLETED: requests.filter(r => r.status === 'COMPLETED').length
  }
  const mineCount = requests.filter(r => r.user.id === userId).length

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.unauth}>
          <h1>📝 Requests</h1>
          <p>Sign in to view, create, and manage requests.</p>
          <Link href="/auth/login?callbackUrl=/requests" className="btn-primary">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Requests</h1>
          <p className={styles.subtitle}>Create, manage, and fulfill community requests</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Request</button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'all' ? styles.active : ''}`} onClick={() => setTab('all')}>
          All ({requests.length})
        </button>
        <button className={`${styles.tab} ${tab === 'mine' ? styles.active : ''}`} onClick={() => setTab('mine')}>
          My Requests ({mineCount})
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className={styles.createForm}>
          <h3>Create New Request</h3>
          <input type="text" placeholder="Request title *" value={newRequest.title} onChange={e => setNewRequest({ ...newRequest, title: e.target.value })} className={styles.input} />
          <textarea placeholder="Describe what you need..." value={newRequest.description} onChange={e => setNewRequest({ ...newRequest, description: e.target.value })} className={styles.textarea} rows={3} />
          <div className={styles.formRow}>
            <select value={newRequest.category} onChange={e => setNewRequest({ ...newRequest, category: e.target.value })} className={styles.select}>
              {CATEGORIES.filter(c => c !== 'ALL').map(cat => (<option key={cat} value={cat}>{cat.charAt(0) + cat.slice(1).toLowerCase()}</option>))}
            </select>
            <select value={newRequest.priority} onChange={e => setNewRequest({ ...newRequest, priority: e.target.value })} className={styles.select}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className={styles.formRow}>
            <input type="number" placeholder="Budget (optional)" value={newRequest.budget} onChange={e => setNewRequest({ ...newRequest, budget: e.target.value })} className={styles.input} />
            <input type="number" placeholder="Goal Amount (optional)" value={newRequest.goalAmount} onChange={e => setNewRequest({ ...newRequest, goalAmount: e.target.value })} className={styles.input} />
          </div>
          <div className={styles.formRow}>
            <input type="text" placeholder="Location (optional)" value={newRequest.location} onChange={e => setNewRequest({ ...newRequest, location: e.target.value })} className={styles.input} />
            <select value={newRequest.payoutCurrency} onChange={e => setNewRequest({ ...newRequest, payoutCurrency: e.target.value })} className={styles.select}>
              {['BTC','ETH','USDT','USDC','XMR','XTM','ARRR','DERO','ZANO','OTHER'].map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <input type="text" placeholder="Payout address (optional)" value={newRequest.payoutAddress} onChange={e => setNewRequest({ ...newRequest, payoutAddress: e.target.value })} className={styles.input} />
          <label className={styles.checkbox}>
            <input type="checkbox" checked={newRequest.isPublic} onChange={e => setNewRequest({ ...newRequest, isPublic: e.target.checked })} />
            Make public (visible to everyone)
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" checked={newRequest.allowFulfillments} onChange={e => setNewRequest({ ...newRequest, allowFulfillments: e.target.checked })} />
            Allow others to offer to fulfill this request
          </label>
          <div className={styles.formActions}>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Request'}</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input type="text" placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.searchInput} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Status</option>
          {['PENDING','APPROVED','REJECTED','COMPLETED'].map(s => (<option key={s} value={s}>{STATUS_ICONS[s]} {s}</option>))}
        </select>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Categories</option>
          {CATEGORIES.filter(c => c !== 'ALL').map(cat => (<option key={cat} value={cat}>{cat}</option>))}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Priorities</option>
          {['LOW','MEDIUM','HIGH','URGENT'].map(p => (<option key={p} value={p}>{p}</option>))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.filterSelect}>
          <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="mostComments">Most Comments</option><option value="mostOffers">Most Offers</option>
        </select>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filtered.length} {filtered.length === 1 ? 'request' : 'requests'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📝</div>
          <h3>No requests found</h3>
          <p>Try adjusting your filters or create a new request.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Request</button>
        </div>
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map((req) => {
            const isOwner = req.user.id === userId
            const link = getLinkInfo(req)
            const canManage = isOwner || isAdmin
            return (
              <div key={req.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <span className={`badge badge-${req.status.toLowerCase()}`}>{STATUS_ICONS[req.status]} {req.status}</span>
                    <span className={styles.priorityBadge} style={{ backgroundColor: PRIORITY_COLORS[req.priority] + '20', color: PRIORITY_COLORS[req.priority], borderColor: PRIORITY_COLORS[req.priority] + '40' }}>{req.priority}</span>
                  </div>
                  <div className={styles.cardActions}>
                    {req.status === 'PENDING' && (isAdmin || !isOwner) && (
                      <>
                        <button onClick={() => handleApprove(req.id)} className={styles.approveBtn}>Approve</button>
                        <button onClick={() => handleReject(req.id)} className={styles.rejectBtn}>Reject</button>
                      </>
                    )}
                    {canManage && (
                      <>
                        <button onClick={() => { setEditingRequest(req); setEditForm({ title: req.title, description: req.description || '', category: req.category, priority: req.priority, budget: req.budget?.toString() || '', goalAmount: req.goalAmount?.toString() || '', location: req.location || '', isPublic: req.isPublic, allowFulfillments: req.allowFulfillments }) }} className={styles.editBtn}>Edit</button>
                        <button onClick={() => handleDelete(req.id)} className={styles.deleteBtn}>Delete</button>
                      </>
                    )}
                  </div>
                </div>

                <Link href={`/requests/${req.id}`} className={styles.cardTitle}>{req.title}</Link>
                {req.description && <p className={styles.cardDesc}>{req.description}</p>}

                {link && (
                  <Link href={link.href} className={styles.linkBadge} style={{ backgroundColor: link.color + '20', color: link.color }}>{link.type}: {link.label}</Link>
                )}
                {!link && <span className={styles.standaloneBadge}>Standalone</span>}

                {(req.goalAmount || 0) > 0 && (
                  <div className={styles.fundingProgress}>
                    <div className={styles.fundingHeader}>
                      <span>💝 ${req.currentFunding || 0} raised</span>
                      <span>of ${req.goalAmount}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${Math.min(((req.currentFunding || 0) / (req.goalAmount || 1)) * 100, 100)}%` }} />
                    </div>
                    {req.payoutAddress && (
                      <div className={styles.payoutRow}>
                        <span className={styles.payoutCrypto}>{req.payoutCurrency}:</span>
                        <code className={styles.payoutAddr}>{req.payoutAddress.slice(0, 20)}...</code>
                        <button onClick={() => copyPayout(req.payoutAddress || '')} className={styles.copyPayoutBtn}>Copy</button>
                      </div>
                    )}
                  </div>
                )}

                {!req.payoutAddress && req.goalAmount && req.goalAmount > 0 && (
                  <div className={styles.fundingProgress}>
                    <div className={styles.fundingHeader}>
                      <span>💝 ${req.currentFunding || 0} raised</span>
                      <span>of ${req.goalAmount}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${Math.min(((req.currentFunding || 0) / (req.goalAmount || 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className={styles.cardMeta}>
                  {req.fulfillmentCount > 0 && (
                    <span className={styles.fulfillmentBadge}>💬 {req.fulfillmentCount} offer{req.fulfillmentCount > 1 ? 's' : ''}</span>
                  )}
                  {req.commentCount > 0 && <span className={styles.commentBadge}>📝 {req.commentCount}</span>}
                  {req.budget && <span>💰 ${req.budget}</span>}
                  {req.location && <span>📍 {req.location}</span>}
                  {req.isPublic && <span className={styles.publicBadge}>🌐 Public</span>}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.authorInfo}>
                    {req.user.image ? (
                      <Image src={req.user.image} alt="" className={styles.authorAvatar} width={28} height={28} />
                    ) : (
                      <span className={styles.authorAvatar}>{(req.user.name?.[0] || req.user.email[0]).toUpperCase()}</span>
                    )}
                    <span className={styles.authorName}>{req.user.name || req.user.email.split('@')[0]}</span>
                  </div>
                  <span className={styles.cardDate}>{formatDate(req.createdAt)}</span>
                </div>

                <Link href={`/requests/${req.id}`} className={styles.viewDetailsBtn}>View Details →</Link>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingRequest && (
        <div className="modal-overlay" onClick={() => setEditingRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Request</h2>
            <input type="text" placeholder="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className={styles.input} />
            <textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={styles.textarea} rows={3} />
            <div className={styles.formRow}>
              <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={styles.select}>
                {CATEGORIES.filter(c => c !== 'ALL').map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              <select value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })} className={styles.select}>
                {['LOW','MEDIUM','HIGH','URGENT'].map(p => (<option key={p} value={p}>{p}</option>))}
              </select>
            </div>
            <div className={styles.formRow}>
              <input type="number" placeholder="Budget" value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: e.target.value })} className={styles.input} />
              <input type="number" placeholder="Goal Amount" value={editForm.goalAmount} onChange={e => setEditForm({ ...editForm, goalAmount: e.target.value })} className={styles.input} />
            </div>
            <input type="text" placeholder="Location" value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })} className={styles.input} />
            <label className={styles.checkbox}>
              <input type="checkbox" checked={editForm.isPublic} onChange={e => setEditForm({ ...editForm, isPublic: e.target.checked })} />
              Public
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={editForm.allowFulfillments} onChange={e => setEditForm({ ...editForm, allowFulfillments: e.target.checked })} />
              Allow fulfillment offers
            </label>
            <div className={styles.formActions}>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => setEditingRequest(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
