'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ImageUploader from '@/components/ImageUploader'
import { QRCodeModal } from '@/components/QRCodeModal'
import styles from './page.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import { getCryptoIcon, getCryptoColor } from '@/lib/crypto-icons'
import { useToast } from '@/context/ToastContext'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import HashtagInput from '@/components/HashtagInput'
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '@/lib/request-categories'
import { EmptyState } from '@/components/EmptyState'

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
  imageUrl: string | null
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
  showDonationAddress: boolean
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
    donationAddresses: DonationAddr[]
  }
  commentCount: number
  fulfillmentCount: number
  supportCount: number
  viewCount?: number
}

interface RequestsClientProps {
  initialRequests: Request[]
  userId: string
  userRole: string
  isAuthenticated: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  URGENT: '#ef4444'
}

export default function RequestsClient({ initialRequests, userId, userRole, isAuthenticated }: RequestsClientProps) {
  const { success, error: toastError, warning } = useToast()
  const [requests, setRequests] = useState(initialRequests)
  const [tab, setTab] = useState<'active' | 'mine'>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [showCreate, setShowCreate] = useState(false)
  const [editingRequest, setEditingRequest] = useState<Request | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', budget: '', goalAmount: '', location: '', isPublic: true, allowFulfillments: true, showDonationAddress: true, images: [] as string[], hashtags: [] as string[] })
  const [saving, setSaving] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '', description: '', category: 'GENERAL', priority: 'MEDIUM',
    budget: '', goalAmount: '', location: '', isPublic: true, allowFulfillments: true, showDonationAddress: true, createGroup: false,
    images: [] as string[], hashtags: [] as string[]
  })
  const [creating, setCreating] = useState(false)
  const [selectedDonation, setSelectedDonation] = useState<DonationAddr | null>(null)
  const [qrModal, setQrModal] = useState<{ open: boolean; currency: string; address: string }>({ open: false, currency: '', address: '' })
  const [supportModal, setSupportModal] = useState<{ open: boolean; reqId: string }>({ open: false, reqId: '' })
  const [supportMessage, setSupportMessage] = useState('')
  const [supporting, setSupporting] = useState(false)
  const [supportingIds, setSupportingIds] = useState<Set<string>>(new Set())
  const [donationSelector, setDonationSelector] = useState<{ open: boolean; mode: 'create' | 'edit'; selectedIds: string[] }>({ open: false, mode: 'create', selectedIds: [] })
  const [userDonationAddrs, setUserDonationAddrs] = useState<DonationAddr[]>([])
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  const isAdmin = userRole === 'ADMIN'
  const { location: passportLocation } = usePassportLocation()
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState('25')
  const [geocodingLoading, setGeocodingLoading] = useState(false)

  useEffect(() => {
    if (passportLocation?.latitude && passportLocation?.longitude && !zipCode) {
      setUserLocation({ lat: passportLocation.latitude, lon: passportLocation.longitude })
      setRadius(String(passportLocation.searchRadius || 25))
    }
  }, [passportLocation])

  const geocodeZipCode = async () => {
    if (!zipCode.trim()) { setUserLocation(null); return }
    setGeocodingLoading(true)
    try {
      const result = await geocodeLocation(zipCode)
      if (result) setUserLocation({ lat: result.latitude, lon: result.longitude })
      else setUserLocation(null)
    } catch { setUserLocation(null) }
    finally { setGeocodingLoading(false) }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/users/donations')
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.addresses) setUserDonationAddrs(data.addresses) })
        .catch(() => {})
    }
  }, [isAuthenticated])

  const filteredRequests = () => {
    let result = [...requests]

    if (tab === 'active') {
      result = result.filter(r => r.status === 'PENDING')
    }
    if (tab === 'mine' && userId) {
      result = result.filter(r => r.user.id === userId)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'ALL') result = result.filter(r => r.category === categoryFilter)

    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(r => {
        if (r.latitude == null || r.longitude == null) return false
        const distance = calculateDistance(userLocation.lat, userLocation.lon, r.latitude, r.longitude)
        return distance <= radiusMiles
      })
    }

    switch (sortBy) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break
      case 'mostComments': result.sort((a, b) => b.commentCount - a.commentCount); break
      case 'mostOffers': result.sort((a, b) => b.fulfillmentCount - a.fulfillmentCount); break
      case 'mostSupported': result.sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0)); break
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
          imageUrl: newRequest.images[0] || null,
          category: newRequest.category,
          priority: newRequest.priority,
          budget: newRequest.budget ? parseFloat(newRequest.budget) : null,
          goalAmount: newRequest.goalAmount ? parseFloat(newRequest.goalAmount) : null,
          location: newRequest.location || null,
          isPublic: newRequest.isPublic,
          allowFulfillments: newRequest.allowFulfillments,
          showDonationAddress: newRequest.showDonationAddress,
          createGroup: newRequest.createGroup,
          hashtags: newRequest.hashtags
        })
      })
      if (res.ok) {
        const created = await res.json()
        setRequests([{
          ...created,
          user: { id: userId, name: null, email: '', image: null, shopSlug: null, donationAddresses: [] },
          commentCount: 0, fulfillmentCount: 0, supportCount: 0
        }, ...requests])
        setShowCreate(false)
        setNewRequest({ title: '', description: '', category: 'GENERAL', priority: 'MEDIUM', budget: '', goalAmount: '', location: '', isPublic: true, allowFulfillments: true, showDonationAddress: true, createGroup: false, images: [], hashtags: [] })
        success('Request created!')
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to create')
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
          imageUrl: editForm.images[0] || null,
          category: editForm.category,
          priority: editForm.priority,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          goalAmount: editForm.goalAmount ? parseFloat(editForm.goalAmount) : null,
          location: editForm.location || null,
          isPublic: editForm.isPublic,
          allowFulfillments: editForm.allowFulfillments,
          showDonationAddress: editForm.showDonationAddress,
          hashtags: editForm.hashtags
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      if (res.ok) { setRequests(requests.filter(r => r.id !== id)); success('Deleted') }
    } catch (err) { console.error(err) }
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
        if (data.removed) {
          setSupportingIds(prev => { const n = new Set(prev); n.delete(supportModal.reqId); return n })
          success('Support removed')
        } else {
          setSupportingIds(prev => new Set(prev).add(supportModal.reqId))
          success('You supported this request!')
        }
        setRequests(requests.map(r => r.id === supportModal.reqId ? { ...r, supportCount: data.count } : r))
      }
    } catch (err) { console.error(err) } finally {
      setSupporting(false)
      setSupportModal({ open: false, reqId: '' })
    }
  }

  const handleDragStart = (index: number) => setDraggedIdx(index)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (targetIndex: number) => {
    if (draggedIdx === null || draggedIdx === targetIndex) { setDraggedIdx(null); return }
    const arr = [...donationSelector.selectedIds]
    const [moved] = arr.splice(draggedIdx, 1)
    arr.splice(targetIndex, 0, moved)
    setDonationSelector(prev => ({ ...prev, selectedIds: arr }))
    setDraggedIdx(null)
  }

  const filtered = filteredRequests()
  const mineCount = requests.filter(r => r.user.id === userId).length
  const activeCount = requests.filter(r => r.status === 'PENDING').length

  if (!isAuthenticated) {
    return (
      <div className={styles.page}>
        <div className={styles.unauth}>
          <h1>Requests</h1>
          <p>Sign in to view, create, and manage requests.</p>
          <Link href="/auth/login?callbackUrl=/requests" className="btn-primary">Sign In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Requests</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New Request</button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'active' ? styles.active : ''}`} onClick={() => setTab('active')}>
          Active ({activeCount})
        </button>
        <button className={`${styles.tab} ${tab === 'mine' ? styles.active : ''}`} onClick={() => setTab('mine')}>
          My Requests ({mineCount})
        </button>
      </div>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </h2>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Search</label>
            <input type="text" placeholder="Search requests..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.filterInput} />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Categories</option>
              {REQUEST_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.filterSelect}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="mostSupported">Most Supported</option>
              <option value="mostComments">Most Comments</option>
              <option value="mostOffers">Most Offers</option>
            </select>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Distance from ZIP</label>
            <div>
              <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Enter ZIP code" style={{ width: '100%', padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '8px' }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={radius} onChange={e => setRadius(e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.875rem' }} disabled={!userLocation && !zipCode}>
                  <option value="5">5 mi</option>
                  <option value="10">10 mi</option>
                  <option value="25">25 mi</option>
                  <option value="50">50 mi</option>
                  <option value="100">100 mi</option>
                </select>
                <button onClick={geocodeZipCode} disabled={geocodingLoading || !zipCode.trim()} style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', opacity: geocodingLoading || !zipCode.trim() ? 0.5 : 1 }}>
                  {geocodingLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>
            {passportLocation?.latitude && passportLocation?.longitude && (
              <button
                onClick={() => {
                  setUserLocation({ lat: passportLocation.latitude!, lon: passportLocation.longitude! })
                  setRadius(String(passportLocation.searchRadius || 25))
                  setZipCode('')
                }}
                style={{ marginTop: '8px', width: '100%', padding: '8px', background: 'var(--bg-secondary)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}
              >
                📍 Near Me
              </button>
            )}
          </div>

          {(searchQuery || categoryFilter !== 'ALL' || sortBy !== 'newest' || userLocation) && (
            <button onClick={() => { setSearchQuery(''); setCategoryFilter('ALL'); setSortBy('newest'); setUserLocation(null); setZipCode(''); }} className={styles.clearBtn}>
              Clear All Filters
            </button>
          )}
        </aside>

        <main className={styles.content}>
          {showCreate && (
            <div className={styles.createForm}>
              <h3>Create New Request</h3>
              <input type="text" placeholder="Request title *" value={newRequest.title} onChange={e => setNewRequest({ ...newRequest, title: e.target.value })} className={styles.input} />
              <textarea placeholder="Describe what you need..." value={newRequest.description} onChange={e => setNewRequest({ ...newRequest, description: e.target.value })} className={styles.textarea} rows={3} />
              <ImageUploader
                images={newRequest.images}
                onChange={(urls) => setNewRequest({ ...newRequest, images: urls })}
                maxImages={1}
              />
              <div className={styles.formRow}>
                <select value={newRequest.category} onChange={e => setNewRequest({ ...newRequest, category: e.target.value })} className={styles.select}>
                  {REQUEST_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
                </select>
                <select value={newRequest.priority} onChange={e => setNewRequest({ ...newRequest, priority: e.target.value })} className={styles.select}>
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className={styles.formRow}>
                <input type="number" placeholder="Budget (optional)" value={newRequest.budget} onChange={e => setNewRequest({ ...newRequest, budget: e.target.value })} className={styles.input} />
                <input type="number" placeholder="Goal Amount (optional)" value={newRequest.goalAmount} onChange={e => setNewRequest({ ...newRequest, goalAmount: e.target.value })} className={styles.input} />
              </div>
              <input type="text" placeholder="Location (optional)" value={newRequest.location} onChange={e => setNewRequest({ ...newRequest, location: e.target.value })} className={styles.input} />
              <div className={styles.field} style={{ marginBottom: '12px' }}>
                <label className={styles.filterLabel}>Hashtags</label>
                <HashtagInput value={newRequest.hashtags} onChange={(tags) => setNewRequest({ ...newRequest, hashtags: tags })} placeholder="Add hashtags..." />
              </div>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={newRequest.isPublic} onChange={e => setNewRequest({ ...newRequest, isPublic: e.target.checked })} />
                Make public (visible to everyone)
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={newRequest.allowFulfillments} onChange={e => setNewRequest({ ...newRequest, allowFulfillments: e.target.checked })} />
                Allow others to offer to fulfill this request
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={newRequest.showDonationAddress} onChange={e => setNewRequest({ ...newRequest, showDonationAddress: e.target.checked })} />
                Show my donation addresses on this request
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" checked={newRequest.createGroup} onChange={e => setNewRequest({ ...newRequest, createGroup: e.target.checked })} />
                Create a discussion group for this request
              </label>
              {userDonationAddrs.length === 0 && (
                <p className={styles.formHint}>
                  You have no donation addresses set up yet. <Link href="/profile/edit">Manage them in profile settings</Link>
                </p>
              )}
              <div className={styles.formActions}>
                <button onClick={handleCreate} disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Request'}</button>
                <button onClick={() => setShowCreate(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState icon="📝" title="No requests found" description="Try adjusting your filters or create a new request." action={{ label: 'Create Request', onClick: () => setShowCreate(true) }} />
          ) : (
            <>
              <div className={styles.resultsHeader}>
                <span className={styles.resultsCount}>
                  <strong>{filtered.length}</strong> {filtered.length === 1 ? 'request' : 'requests'} found
                </span>
              </div>

              <div className={styles.cardGrid}>
                {filtered.map((req) => {
                  const isOwner = req.user.id === userId
                  const link = getLinkInfo(req)
                  const canManage = isOwner || isAdmin
                  const resolvedAddrs = getResolvedDonationAddrs(req)
                  const pct = req.goalAmount ? Math.min(((req.currentFunding || 0) / (req.goalAmount || 1)) * 100, 100) : 0
                  return (
                    <div key={req.id} className={styles.card}>
                      {req.imageUrl && (
                        <div className={styles.cardImageWrapper}>
                          <img src={req.imageUrl} alt={req.title} className={styles.cardImage} />
                        </div>
                      )}
                      <Link href={`/requests/${req.id}`} className={styles.cardTitle}>{req.title}</Link>
                      <div className={styles.cardTags}>
                        <span className={styles.priorityDot} style={{ backgroundColor: PRIORITY_COLORS[req.priority] }} title={req.priority} />
                        <span className={styles.categoryTag}>{req.category}</span>
                        {link && (
                          <Link href={link.href} className={styles.linkTag} style={{ backgroundColor: link.color + '18', color: link.color }}>{link.type}</Link>
                        )}
                      </div>

                      {req.description && <p className={styles.cardDesc}>{req.description}</p>}

                      {(req.goalAmount || 0) > 0 && (
                        <div className={styles.fundingSection}>
                          <div className={styles.fundingHeader}>
                            <span>💝 ${req.currentFunding || 0} raised</span>
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
                          className={`${styles.supportBtn} ${supportingIds.has(req.id) ? styles.supported : ''}`}
                          onClick={() => handleSupport(req.id)}
                        >
                          👍 {req.supportCount || 0}
                        </button>
                      </div>

                      <div className={styles.cardMeta}>
                        {req.fulfillmentCount > 0 && <span className={styles.badge}>💬 {req.fulfillmentCount} offer{req.fulfillmentCount > 1 ? 's' : ''}</span>}
                        {req.commentCount > 0 && <span className={styles.badge}>📝 {req.commentCount}</span>}
                        {req.budget && <span>💰 ${req.budget}</span>}
                        {req.location && <span>📍 {req.location}</span>}
                        {req.isPublic && <span className={styles.publicBadge}>🌐 Public</span>}
                      </div>

                      <div className={styles.cardFooter}>
                        <Link href={getUserProfileUrl(req.user)} className={styles.authorInfo}>
                          {req.user.image ? (
                            <Image src={req.user.image} alt="" className={styles.authorAvatar} width={28} height={28} />
                          ) : (
                            <span className={styles.authorAvatar}>{(req.user.name?.[0] || '?').toUpperCase()}</span>
                          )}
                          <span className={styles.authorName}>{req.user.name || 'Unknown'}</span>
                        </Link>
                        <span className={styles.cardDate}>{formatDate(req.createdAt)}</span>
                        {req.viewCount != null && req.viewCount > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            {req.viewCount}
                          </span>
                        )}
                      </div>

                      <div className={styles.cardActions}>
                        {canManage && (
                          <button onClick={() => { setEditingRequest(req); setEditForm({ title: req.title, description: req.description || '', category: req.category, priority: req.priority, budget: req.budget?.toString() || '', goalAmount: req.goalAmount?.toString() || '', location: req.location || '', isPublic: req.isPublic, allowFulfillments: req.allowFulfillments, showDonationAddress: req.showDonationAddress, images: (req as any).imageUrl ? [(req as any).imageUrl] : [], hashtags: (req as any).hashtags || [] }) }} className={styles.editBtn}>Edit</button>
                        )}
                        {canManage && <button onClick={() => handleDelete(req.id)} className={styles.deleteBtn}>Delete</button>}
                        <Link href={`/requests/${req.id}`} className={styles.viewDetailsBtn}>View Details →</Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Edit Modal */}
      {editingRequest && (
        <div className="modal-overlay" onClick={() => setEditingRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Request</h2>
            <input type="text" placeholder="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} className={styles.input} />
            <textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className={styles.textarea} rows={3} />
            <ImageUploader
              images={editForm.images}
              onChange={(urls) => setEditForm({ ...editForm, images: urls })}
              maxImages={1}
            />
            <div className={styles.formRow}>
              <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className={styles.select}>
                {REQUEST_CATEGORIES.map(cat => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
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
            <div className={styles.field} style={{ marginBottom: '12px' }}>
              <label className={styles.filterLabel}>Hashtags</label>
              <HashtagInput value={editForm.hashtags} onChange={(tags) => setEditForm({ ...editForm, hashtags: tags })} placeholder="Add hashtags..." />
            </div>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={editForm.isPublic} onChange={e => setEditForm({ ...editForm, isPublic: e.target.checked })} />
              Public
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={editForm.allowFulfillments} onChange={e => setEditForm({ ...editForm, allowFulfillments: e.target.checked })} />
              Allow fulfillment offers
            </label>
            <label className={styles.checkbox}>
              <input type="checkbox" checked={editForm.showDonationAddress} onChange={e => setEditForm({ ...editForm, showDonationAddress: e.target.checked })} />
              Show donation addresses on this request
            </label>
            {userDonationAddrs.length === 0 && (
              <p className={styles.formHint}>
                No donation addresses set. <Link href="/profile/edit">Manage in profile settings</Link>
              </p>
            )}
            <div className={styles.formActions}>
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              <button onClick={() => setEditingRequest(null)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, currency: '', address: '' })}
        currency={qrModal.currency}
        address={qrModal.address}
      />

      {/* Support Modal */}
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
    </div>
  )
}
