'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { QRCodeModal } from '@/components/QRCodeModal'
import { getUserProfileUrl } from '@/lib/utils'
import { getCryptoIcon, getCryptoColor } from '@/lib/crypto-icons'
import { useToast } from '@/context/ToastContext'
import styles from './requests.module.css'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES, PRIORITY_COLORS } from '@/lib/request-categories'

import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}

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
  deadline: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  likes: number
  reposts: number
  isPublic: boolean
  allowFulfillments: boolean
  showDonationAddress: boolean
  createdAt: string
  updatedAt: string
  project: { id: string; title: string } | null
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
    donationAddresses: DonationAddr[]
  }
  commentCount: number
  fulfillmentCount: number
  supportCount: number
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

type SortOption = 'newest' | 'oldest' | 'mostComments' | 'mostSupported' | 'mostOffers'

export default function DashboardRequestsClient({ initialRequests, userId, userRole }: DashboardRequestsClientProps) {
  const { success, error: toastError, warning } = useToast()
  const [requests, setRequests] = useState(initialRequests)
  const [tab, setTab] = useState<'active' | 'mine'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [qrModal, setQrModal] = useState<{ open: boolean; currency: string; address: string }>({ open: false, currency: '', address: '' })
  const [supportModal, setSupportModal] = useState<{ open: boolean; reqId: string }>({ open: false, reqId: '' })
  const [supportMessage, setSupportMessage] = useState('')
  const [supporting, setSupporting] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: 'FUNDING',
    priority: 'MEDIUM',
    budget: '',
    goalAmount: '',
    location: '',
    isPublic: true,
    allowFulfillments: true,
    showDonationAddress: true
  })
  const [creating, setCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const isAdmin = userRole === 'ADMIN'

  const filteredRequests = useMemo(() => {
    let result = [...requests]

    if (tab === 'active') {
      result = result.filter(r => r.status === 'PENDING')
    }
    if (tab === 'mine') {
      result = result.filter(r => r.user.id === userId)
    }

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
      case 'mostSupported':
        result.sort((a, b) => b.supportCount - a.supportCount)
        break
      case 'mostOffers':
        result.sort((a, b) => b.fulfillmentCount - a.fulfillmentCount)
        break
    }

    return result
  }, [requests, tab, userId, searchQuery, statusFilter, categoryFilter, priorityFilter, sortBy])

  const getResolvedDonationAddrs = (req: Request): DonationAddr[] => {
    if (!req.showDonationAddress || !req.user?.donationAddresses) return []
    return req.user.donationAddresses
  }

  const handleCreate = async () => {
    if (!newRequest.title.trim()) { warning('Please enter a title'); return }
    setCreating(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRequest.title,
          description: newRequest.description || null,
          category: newRequest.category,
          priority: newRequest.priority,
          budget: newRequest.budget ? parseFloat(newRequest.budget) : null,
          goalAmount: newRequest.goalAmount ? parseFloat(newRequest.goalAmount) : null,
          location: newRequest.location || null,
          isPublic: newRequest.isPublic,
          allowFulfillments: newRequest.allowFulfillments,
          showDonationAddress: newRequest.showDonationAddress
        })
      })
      if (res.ok) {
        const created = await res.json()
        setRequests([{
          ...created,
          user: {
            id: userId,
            name: null,
            email: '',
            image: null,
            shopSlug: null,
            donationAddresses: []
          },
          commentCount: 0,
          fulfillmentCount: 0,
          supportCount: 0
        }, ...requests])
        setShowCreate(false)
        setNewRequest({
          title: '', description: '', category: 'FUNDING', priority: 'MEDIUM',
          budget: '', goalAmount: '', location: '',
          isPublic: true, allowFulfillments: true, showDonationAddress: true
        })
        success('Request created!')
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to create request')
      }
    } catch (err) {
      console.error('Failed to create:', err)
      toastError('Failed to create request')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/requests/${deleteTarget}`, { method: 'DELETE' })
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== deleteTarget))
        setDeleteTarget(null)
        success('Deleted')
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const handleSupport = async (reqId: string) => {
    if (!userId) { warning('Please log in to support requests'); return }
    setSupportModal({ open: true, reqId })
    setSupportMessage('')
  }

  const submitSupport = async () => {
    if (!supportModal.reqId) return
    setSupporting(true)
    try {
      const res = await fetch(`/api/requests/${supportModal.reqId}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage.trim() || null })
      })
      if (res.ok) {
        const data = await res.json()
        if (!data.removed) {
          success('You supported this request!')
        } else {
          success('Support removed')
        }
        setRequests(requests.map(r => r.id === supportModal.reqId ? { ...r, supportCount: data.count } : r))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSupporting(false)
      setSupportModal({ open: false, reqId: '' })
    }
  }

  const truncateAddr = (addr: string, len = 8) => {
    if (addr.length <= len * 2 + 3) return addr
    return `${addr.slice(0, len)}...${addr.slice(-len)}`
  }

  const getLinkInfo = (req: Request) => {
    if (req.project) return { type: 'Project',, label: req.project.title, href: `/projects/${req.project.id}`, color: '#00d9ff' }
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

  const statusCounts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    COMPLETED: requests.filter(r => r.status === 'COMPLETED').length
  }
  const activeCount = requests.filter(r => r.status === 'PENDING').length
  const mineCount = requests.filter(r => r.user.id === userId).length

  return (
    <div className={styles.page}>
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
              {REQUEST_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
              type="number"
              placeholder="Goal amount (optional)"
              value={newRequest.goalAmount}
              onChange={e => setNewRequest({ ...newRequest, goalAmount: e.target.value })}
              className={styles.input}
            />
          </div>
          <input
            type="text"
            placeholder="Location (optional)"
            value={newRequest.location}
            onChange={e => setNewRequest({ ...newRequest, location: e.target.value })}
            className={styles.input}
          />
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={newRequest.isPublic}
              onChange={e => setNewRequest({ ...newRequest, isPublic: e.target.checked })}
            />
            Make public (visible to everyone)
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={newRequest.allowFulfillments}
              onChange={e => setNewRequest({ ...newRequest, allowFulfillments: e.target.checked })}
            />
            Allow others to offer to fulfill this request
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={newRequest.showDonationAddress}
              onChange={e => setNewRequest({ ...newRequest, showDonationAddress: e.target.checked })}
            />
            Show my donation addresses on this request
          </label>
          <div className={styles.formActions}>
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? 'Creating...' : 'Create Request'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'active' ? styles.active : ''}`} onClick={() => setTab('active')}>
          Active ({activeCount})
        </button>
        <button className={`${styles.tab} ${tab === 'mine' ? styles.active : ''}`} onClick={() => setTab('mine')}>
          My Requests ({mineCount})
        </button>
      </div>

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
            {REQUEST_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
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
            <option value="mostSupported">Most Supported</option>
            <option value="mostComments">Most Comments</option>
            <option value="mostOffers">Most Offers</option>
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <EmptyState icon="📝" title="No requests found" description="Try adjusting your filters, or create a new request." action={{ label: 'Create Request', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className={styles.cardGrid}>
          {filteredRequests.map((req, index) => {
            const isOwner = req.user.id === userId
            const link = getLinkInfo(req)
            const resolvedAddrs = getResolvedDonationAddrs(req)
            const pct = req.goalAmount ? Math.min(((req.currentFunding || 0) / (req.goalAmount || 1)) * 100, 100) : 0
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
                  </div>
                  <div className={styles.cardActions}>
                    {isOwner && (
                      <button onClick={() => setDeleteTarget(req.id)} className={styles.deleteBtn}>Delete</button>
                    )}
                  </div>
                </div>

                <Link href={`/requests/${req.id}`} className={styles.cardTitle}>
                  {req.title}
                </Link>

                {req.description && (
                  <p className={styles.cardDesc}>{req.description}</p>
                )}

                {(req.goalAmount || 0) > 0 && (
                  <div className={styles.fundingSection}>
                    <div className={styles.fundingHeader}>
                      <span>💝 ${(req.currentFunding || 0).toFixed(0)} raised</span>
                      <span>of ${req.goalAmount}</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {resolvedAddrs.length > 0 && (
                  <div className={styles.donationSection}>
                    <div className={styles.donationSectionTitle}>Donate</div>
                    <div className={styles.cryptoButtons}>
                      {resolvedAddrs.map(da => {
                        const iconUrl = getCryptoIcon(da.currency)
                        const color = getCryptoColor(da.currency)
                        const initials = da.currency.substring(0, 2).toUpperCase()
                        return (
                          <button
                            key={da.id}
                            className={styles.cryptoButton}
                            onClick={() => setQrModal({ open: true, currency: da.currency, address: da.address })}
                          >
                            {iconUrl ? (
                              <img src={iconUrl} alt="" className={styles.cryptoButtonIcon} />
                            ) : (
                              <span className={styles.cryptoButtonFallback} style={{ background: color }}>{initials}</span>
                            )}
                            <span className={styles.cryptoButtonTicker}>{da.currency.toUpperCase()}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className={styles.supportRow}>
                  <button
                    className={styles.supportBtn}
                    onClick={() => handleSupport(req.id)}
                  >
                    👍 {req.supportCount || 0}
                  </button>
                </div>

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
                  {req.fulfillmentCount > 0 && <span className={styles.badge}>💬 {req.fulfillmentCount} offer{req.fulfillmentCount > 1 ? 's' : ''}</span>}
                  {req.commentCount > 0 && <span className={styles.badge}>📝 {req.commentCount}</span>}
                  {req.isPublic && <span className={styles.publicBadge}>🌐 Public</span>}
                </div>

                <div className={styles.cardFooter}>
                  <Link href={getUserProfileUrl(req.user)} className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                      {req.user.image ? (
                        <Image src={req.user.image} alt={req.user.name || 'User'} fill sizes="28px" />
                      ) : (
                        <span>{(req.user.name?.[0] || '?').toUpperCase()}</span>
                      )}
                    </div>
                    <span className={styles.authorName}>{req.user.name || 'Unknown'}</span>
                  </Link>
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

      <QRCodeModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, currency: '', address: '' })}
        currency={qrModal.currency}
        address={qrModal.address}
      />

      {supportModal.open && (
        <div className="modal-overlay" onClick={() => setSupportModal({ open: false, reqId: '' })}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>👍 Support this Request</h2>
            <p className={styles.modalText}>How can you help? (optional)</p>
            <textarea
              value={supportMessage}
              onChange={e => setSupportMessage(e.target.value)}
              placeholder="e.g., I can contribute $20, share this with my network, help with design..."
              className={styles.textarea}
              rows={4}
            />
            <div className={styles.formActions}>
              <button onClick={submitSupport} disabled={supporting} className="btn-primary">
                {supporting ? '...' : 'Support'}
              </button>
              <button onClick={() => setSupportModal({ open: false, reqId: '' })} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message="This will permanently delete this request. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
