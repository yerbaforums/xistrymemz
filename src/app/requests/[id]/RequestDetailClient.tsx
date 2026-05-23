'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { QRCodeModal } from '@/components/QRCodeModal'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { MakeOfferModal } from '@/components/MakeOfferModal'
import { getUserProfileUrl } from '@/lib/utils'
import { getCryptoIcon, getCryptoName } from '@/lib/crypto-icons'
import ShareSection from '@/components/ShareSection'
import ViewCount from '@/components/ViewCount'
import { useRecordView } from '@/hooks/useRecordView'

const CATEGORIES = [
  { value: 'GENERAL', label: 'General', icon: '\u{1F4CB}' },
  { value: 'HELP', label: 'Help Needed', icon: '\u{1F198}' },
  { value: 'COLLABORATION', label: 'Collaboration', icon: '🤝' },
  { value: 'SUPPORT', label: 'Support', icon: '\u{1F4AA}' },
  { value: 'RESOURCES', label: 'Resources', icon: '\u{1F4E6}' },
  { value: 'FEEDBACK', label: 'Feedback', icon: '💬' },
  { value: 'IDEA', label: 'Idea', icon: '\u{1F4A1}' },
  { value: 'BUG', label: 'Bug Report', icon: '\u{1F41B}' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#888' },
  { value: 'MEDIUM', label: 'Medium', color: '#fa0' },
  { value: 'HIGH', label: 'High', color: '#f36' },
  { value: 'URGENT', label: 'Urgent', color: '#ff0000' },
]

const STATUS_LABELS: Record<string, { label: string, icon: string }> = {
  PENDING: { label: 'Pending', icon: '\u23F3' },
  APPROVED: { label: 'Approved', icon: '\u2705' },
  REJECTED: { label: 'Rejected', icon: '\u274C' },
  COMPLETED: { label: 'Completed', icon: '\u{1F389}' },
}

interface DonationAddr {
  id: string
  currency: string
  address: string
  label: string | null
  qrCodeUrl: string | null
  showQR: boolean
  sortOrder: number
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    shopSlug: string | null
  }
}

interface Product {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
}

interface StatusChange {
  id: string
  fromStatus: string
  toStatus: string
  changedBy: string
  changedByName: string
  reason: string | null
  createdAt: string
}

interface Fulfillment {
  id: string
  title: string
  content: string
  status: string
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    shopSlug: string | null
  }
}

interface Supporter {
  id: string
  message: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    username: string | null
    image: string | null
  }
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
  currentFunding: number
  showDonationAddress: boolean
  deadline: string | null
  location: string | null
  likes: number
  reposts: number
  createdAt: string
  updatedAt: string
  completedBy: string | null
  completedAt: string | null
  allowFulfillments: boolean
  imageUrl: string | null
  viewCount?: number
  plan: {
    id: string
    title: string
    user: {
      id: string
      name: string | null
      username: string | null
      shopSlug: string | null
    }
  } | null
  user: {
    id: string
    name: string | null
    username: string | null
    shopSlug: string | null
    donationAddresses: DonationAddr[]
  }
  product?: Product | null
  comments: Comment[]
  statusHistory?: StatusChange[]
  fulfillments: Fulfillment[]
  supportCount?: number
}

interface RequestDetailClientProps {
  request: Request
  userId: string
  userRole?: string
}

export default function RequestDetailClient({ request: initialRequest, userId, userRole = 'USER' }: RequestDetailClientProps) {
  const { success, error: toastError, warning } = useToast()
  const [request, setRequest] = useState(initialRequest)

  useRecordView('request', initialRequest?.id || '')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<StatusChange | null>(null)
  const [completeMessage, setCompleteMessage] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')
  const [showContactModal, setShowContactModal] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [contactMessage, setContactMessage] = useState('')
  const [showFulfillmentForm, setShowFulfillmentForm] = useState(false)
  const [fulfillmentForm, setFulfillmentForm] = useState({ title: '', content: '' })
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>(initialRequest.fulfillments || [])
  const [allowFulfillments, setAllowFulfillments] = useState(initialRequest.allowFulfillments)
  const [showDonationAddress, setShowDonationAddress] = useState(initialRequest.showDonationAddress)
  const [fundingSlider, setFundingSlider] = useState(initialRequest.currentFunding || 0)
  const [qrModal, setQrModal] = useState<{ open: boolean; currency: string; address: string }>({ open: false, currency: '', address: '' })
  const [supportModalOpen, setSupportModalOpen] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [supporting, setSupporting] = useState(false)
  const [isSupporting, setIsSupporting] = useState(false)
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [supportCount, setSupportCount] = useState(initialRequest.supportCount || 0)
  const [editForm, setEditForm] = useState({
    title: initialRequest.title,
    description: initialRequest.description || '',
    category: initialRequest.category,
    priority: initialRequest.priority,
    budget: initialRequest.budget?.toString() || '',
    deadline: initialRequest.deadline ? initialRequest.deadline.split('T')[0] : '',
    allowFulfillments: initialRequest.allowFulfillments,
    showDonationAddress: initialRequest.showDonationAddress,
  })

  const isPlanOwner = request.plan?.user.id === userId
  const isOwnRequest = request.user.id === userId
  const isOwner = isOwnRequest || isPlanOwner
  const canHelpComplete = request.status === 'PENDING' && !isOwnRequest && !request.product
  const canContact = !isOwnRequest
  const canEdit = isOwnRequest && request.status === 'PENDING'
  const canRollback = (isOwnRequest || isPlanOwner || userRole === 'ADMIN') && request.status !== 'PENDING'
  const canViewHistory = (isPlanOwner || isOwnRequest) && request.statusHistory && request.statusHistory.length > 0
  const canApprove = request.plan && request.status === 'PENDING'
  const category = CATEGORIES.find(c => c.value === request.category) || CATEGORIES[0]
  const priority = PRIORITIES.find(p => p.value === request.priority) || PRIORITIES[1]
  const resolvedDonationAddrs = showDonationAddress ? (request.user?.donationAddresses || []) : []

  useEffect(() => {
    fetchSupporters()
    if (userId) {
      fetch(`/api/requests/${request.id}/support`)
        .then(r => r.json())
        .then(data => {
          if (data.supports) {
            setIsSupporting(data.supports.some((s: Supporter) => s.user.id === userId))
          }
        })
        .catch(() => {})
    }
  }, [])

  const fetchSupporters = () => {
    fetch(`/api/requests/${request.id}/support`)
      .then(r => r.json())
      .then(data => {
        if (data.supports) {
          setSupporters(data.supports)
          setSupportCount(data.supports.length)
        }
      })
      .catch(() => {})
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/approve`, { method: 'POST' })
      if (res.ok) {
        const updated = { ...request, status: 'APPROVED' }
        setRequest(updated)
        addToHistory('PENDING', 'APPROVED', 'Request approved by project owner')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/reject`, { method: 'POST' })
      if (res.ok) {
        setRequest({ ...request, status: 'REJECTED' })
        addToHistory('PENDING', 'REJECTED', 'Request rejected by project owner')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: completeMessage, completedBy: userId })
      })

      if (res.ok) {
        setShowCompleteModal(false)
        setCompleteMessage('')
        setRequest({
          ...request,
          status: 'COMPLETED',
          completedBy: userId,
          completedAt: new Date().toISOString()
        })
        addToHistory('PENDING', 'COMPLETED', completeMessage || 'Request completed by helper')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async () => {
    if (!selectedHistory) return
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toStatus: selectedHistory.fromStatus,
          reason: rollbackReason
        })
      })

      if (res.ok) {
        setShowHistoryModal(false)
        setSelectedHistory(null)
        setRollbackReason('')
        setRequest({ ...request, status: selectedHistory.fromStatus })
        addToHistory(request.status, selectedHistory.fromStatus, rollbackReason || `Rolled back to ${STATUS_LABELS[selectedHistory.fromStatus]?.label}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleContactMessage = async () => {
    if (!contactMessage.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: request.user.id,
          content: contactMessage
        })
      })
      if (res.ok) {
        setShowContactModal(false)
        setContactMessage('')
        success('Message sent!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addToHistory = (fromStatus: string, toStatus: string, reason?: string) => {
    if (!request.statusHistory) {
      request.statusHistory = []
    }
    const newEntry: StatusChange = {
      id: `temp-${Date.now()}`,
      fromStatus,
      toStatus,
      changedBy: userId,
      changedByName: 'You',
      reason: reason || null,
      createdAt: new Date().toISOString()
    }
    setRequest({
      ...request,
      statusHistory: [newEntry, ...request.statusHistory]
    })
  }

  const handleEdit = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          category: editForm.category,
          priority: editForm.priority,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
          allowFulfillments: editForm.allowFulfillments,
          showDonationAddress: editForm.showDonationAddress,
        })
      })

      if (res.ok) {
        setShowEditModal(false)
        setRequest({
          ...request,
          title: editForm.title,
          description: editForm.description,
          category: editForm.category,
          priority: editForm.priority,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          deadline: editForm.deadline ? new Date(editForm.deadline).toISOString() : null,
          allowFulfillments: editForm.allowFulfillments,
          showDonationAddress: editForm.showDonationAddress,
        })
        setAllowFulfillments(editForm.allowFulfillments)
        setShowDonationAddress(editForm.showDonationAddress)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: comment })
      })

      if (res.ok) {
        const newComment = await res.json()
        setRequest({
          ...request,
          comments: [...request.comments, newComment]
        })
        setComment('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFulfillment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fulfillmentForm.title.trim() || !fulfillmentForm.content.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/fulfillments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fulfillmentForm)
      })

      if (res.ok) {
        const newFulfillment = await res.json()
        setFulfillments([newFulfillment, ...fulfillments])
        setFulfillmentForm({ title: '', content: '' })
        setShowFulfillmentForm(false)
        success('Offer submitted!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRespondFulfillment = async (fid: string, action: string, autoComplete = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/fulfillments/${fid}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, autoComplete })
      })

      if (res.ok) {
        setFulfillments(fulfillments.map(f =>
          f.id === fid ? { ...f, status: action } : f
        ))
        if (action === 'APPROVED' && autoComplete) {
          setRequest({
            ...request,
            status: 'COMPLETED',
            completedAt: new Date().toISOString()
          })
        }
        success(`Offer ${action.toLowerCase()}!`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFulfillments = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowFulfillments: !allowFulfillments })
      })

      if (res.ok) {
        setAllowFulfillments(!allowFulfillments)
        success(`Fulfillments ${!allowFulfillments ? 'enabled' : 'disabled'}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleDonationAddress = async () => {
    const newVal = !showDonationAddress
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showDonationAddress: newVal })
      })
      if (res.ok) {
        setShowDonationAddress(newVal)
        success(newVal ? 'Donation addresses now visible' : 'Donation addresses hidden')
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveFunding = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFunding: fundingSlider })
      })
      if (res.ok) {
        setRequest({ ...request, currentFunding: fundingSlider })
        success('Funding updated!')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSupport = async () => {
    if (!userId) {
      warning('Please log in to support requests')
      return
    }
    setSupportModalOpen(true)
    setSupportMessage('')
  }

  const submitSupport = async () => {
    setSupporting(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage.trim() || null })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.removed) {
          setIsSupporting(false)
          success('Support removed')
        } else {
          setIsSupporting(true)
          success('You supported this request!')
        }
        setSupportCount(data.count)
        fetchSupporters()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSupporting(false)
      setSupportModalOpen(false)
    }
  }

  const truncateAddr = (addr: string, len = 8) => {
    if (addr.length <= len * 2 + 3) return addr
    return `${addr.slice(0, len)}...${addr.slice(-len)}`
  }

  const fundingPct = request.goalAmount && request.goalAmount > 0
    ? Math.min(((request.currentFunding || 0) / (request.goalAmount || 1)) * 100, 100)
    : 0

  return (
    <div className={styles.page}>
      <Link href="/requests" className={styles.backLink}>
        ← Back to Requests
      </Link>

      <div className={styles.detailLayout}>
        {/* LEFT COLUMN */}
        <div className={styles.detailMain}>
          {/* INFO SECTION */}
          <div className={styles.detailCard}>
            <div className={styles.header}>
              <div className={styles.badges}>
                <span className={`badge badge-${request.status.toLowerCase()}`}>
                  {STATUS_LABELS[request.status]?.icon || ''} {STATUS_LABELS[request.status]?.label || request.status}
                </span>
                <span className={styles.categoryBadge}>
                  {category.icon} {category.label}
                </span>
                <span className={styles.priorityBadge} style={{ color: priority.color }}>
                  {priority.label}
                </span>
              </div>
              <div className={styles.headerActions}>
                {canViewHistory && (
                  <button onClick={() => setShowHistoryModal(true)} className={styles.historyBtn}>
                    📜 History
                  </button>
                )}
                <span className={styles.date}>
                  {new Date(request.createdAt).toLocaleDateString()}
                </span>
                <ViewCount count={request.viewCount || 0} />
              </div>
            </div>

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{request.title}</h1>
              <button onClick={() => navigator.clipboard.writeText(window.location.href)} className={styles.editBtn} title="Copy link">🔗</button>
              {canEdit && (
                <button onClick={() => setShowEditModal(true)} className={styles.editBtn}>
                  ✏️ Edit
                </button>
              )}
            </div>

            {request.imageUrl && (
              <div className={styles.detailImageWrapper}>
                <img src={request.imageUrl} alt={request.title} className={styles.detailImage} />
              </div>
            )}

            {request.description && (
              <p className={styles.description}>{request.description}</p>
            )}

            <div className={styles.meta}>
              {request.plan && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Project</span>
                  <Link href={`/plans/${request.plan.id}`} className={styles.metaValue}>
                    {request.plan.title}
                  </Link>
                </div>
              )}
              {!request.plan && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Type</span>
                  <span className={styles.metaValue}>Standalone Request</span>
                </div>
              )}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Requested by</span>
                <Link href={getUserProfileUrl(request.user)} className={styles.metaValue}>
                  {request.user.name || 'User'}
                </Link>
              </div>
              {request.plan && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Project owner</span>
                  <Link href={getUserProfileUrl(request.plan.user)} className={styles.metaValue}>
                    {request.plan.user.name || 'User'}
                  </Link>
                </div>
              )}
              {request.budget && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Budget</span>
                  <span className={styles.metaValue}>${request.budget.toFixed(2)}</span>
                </div>
              )}
              {request.deadline && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Deadline</span>
                  <span className={styles.metaValue}>
                    {new Date(request.deadline).toLocaleDateString()}
                    {new Date(request.deadline) < new Date() && request.status === 'PENDING' && (
                      <span className={styles.overdue}> (Overdue)</span>
                    )}
                  </span>
                </div>
              )}
              {request.product && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Marketplace Item</span>
                  <Link href={`/products/${request.product.id}`} className={styles.metaValue}>
                    {request.product.title}
                    {request.product.price && ` - $${request.product.price.toFixed(2)}`}
                  </Link>
                </div>
              )}
              {request.completedBy && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Completed by</span>
                  <Link href={getUserProfileUrl({ id: request.completedBy })} className={styles.metaValue}>
                    {request.completedBy === request.user.id ? 'Requester (Self)' : 'Helper'}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* FUNDING & DONATIONS SECTION */}
          {((request.goalAmount || 0) > 0 || resolvedDonationAddrs.length > 0 || isOwner) && (
            <div className={styles.detailCard}>
              <h2 className={styles.sectionTitle}>Funding & Donations</h2>

              {isOwner && (
                <div className={styles.fundingSliderSection}>
                  <div className={styles.fundingSliderHeader}>
                    <span className={styles.metaLabel}>Adjust Funding</span>
                    <span className={styles.fundingSliderValue}>${fundingSlider}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={request.goalAmount || Math.max(fundingSlider * 2, 100)}
                    step={1}
                    value={fundingSlider}
                    onChange={e => setFundingSlider(parseFloat(e.target.value))}
                    className={styles.fundingSlider}
                  />
                  <button
                    onClick={handleSaveFunding}
                    disabled={loading || fundingSlider === request.currentFunding}
                    className={styles.saveFundingBtn}
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}

              {(request.goalAmount || 0) > 0 && (
                <div className={styles.fundingBarSection}>
                  <div className={styles.fundingProgress}>
                    <div className={styles.fundingBar}>
                      <div
                        className={styles.fundingFill}
                        style={{ width: `${fundingPct}%` }}
                      />
                    </div>
                    <span className={styles.fundingText}>
                      ${request.currentFunding || 0} raised of ${request.goalAmount} goal ({Math.round(fundingPct)}%)
                    </span>
                  </div>
                </div>
              )}

              {isOwner && (
                <div className={styles.donationToggle}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={showDonationAddress}
                      onChange={handleToggleDonationAddress}
                    />
                    <span className={styles.toggleText}>Show donation addresses on this request</span>
                  </label>
                </div>
              )}

              {resolvedDonationAddrs.length > 0 && (
                <div className={styles.donationSection}>
                  <div className={styles.donationSectionTitle}>Donate</div>
                  {resolvedDonationAddrs.map(da => {
                    const cryptoName = getCryptoName(da.currency)
                    const iconUrl = getCryptoIcon(da.currency)
                    return (
                      <div key={da.id} className={styles.donationItem}>
                        <div className={styles.donationIcon}>
                          {iconUrl ? (
                            <img src={iconUrl} alt="" width={16} height={16} />
                          ) : (
                            <span>{da.currency[0]}</span>
                          )}
                        </div>
                        <div className={styles.donationInfo}>
                          <span className={styles.donationLabel}>{da.label || cryptoName}</span>
                          <span className={styles.donationAddr}>{truncateAddr(da.address)}</span>
                        </div>
                        <div className={styles.donationActions}>
                          <button
                            onClick={() => setQrModal({ open: true, currency: da.label || da.currency, address: da.address })}
                            className={styles.donationBtn}
                            title="View QR Code"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z"/></svg>
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(da.address); success('Copied!') }}
                            className={styles.donationBtn}
                            title="Copy address"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {resolvedDonationAddrs.length === 0 && isOwnRequest && (
                <p className={styles.noDonationHint}>
                  No donation addresses set. <Link href="/profile/edit">Manage them in profile settings</Link>
                </p>
              )}
            </div>
          )}

          {/* SUPPORTERS SECTION */}
          <div className={styles.detailCard}>
            <div className={styles.supportersHeader}>
              <h2 className={styles.sectionTitle}>Supporters ({supportCount})</h2>
              {request.status === 'PENDING' && !isOwnRequest && (
                <button
                  className={`${styles.supportBtn} ${isSupporting ? styles.supported : ''}`}
                  onClick={handleSupport}
                >
                  👍 {isSupporting ? 'Supported' : 'Support'}
                </button>
              )}
            </div>

            {supporters.length > 0 ? (
              <div className={styles.supportersList}>
                {supporters.map(s => (
                  <div key={s.id} className={styles.supporterItem}>
                    <Link href={getUserProfileUrl(s.user)} className={styles.supporterAuthor}>
                      {s.user.name || s.user.username || 'Anonymous'}
                    </Link>
                    <span className={styles.supporterDate}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    {s.message && <p className={styles.supporterMessage}>{s.message}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noSupporters}>No supporters yet. Be the first!</p>
            )}
          </div>

          {/* MANAGE SECTION */}
          {canApprove && (
            <div className={styles.detailCard}>
              <h2 className={styles.sectionTitle}>Manage Request</h2>
              <div className={styles.actions}>
                <button
                  onClick={handleApprove}
                  className={styles.approveBtn}
                  disabled={loading}
                >
                  \u2705 Approve
                </button>
                <button
                  onClick={handleReject}
                  className={styles.rejectBtn}
                  disabled={loading}
                >
                  \u274C Reject
                </button>
              </div>
            </div>
          )}

          {/* QUICK ACTIONS */}
          {canHelpComplete && (
            <div className={styles.detailCard}>
              <button
                onClick={() => setShowCompleteModal(true)}
                className={styles.helpBtn}
                disabled={loading}
              >
                🤝 Help Complete This Request
              </button>
            </div>
          )}

          {canContact && request.status === 'PENDING' && (
            <div className={styles.quickActions}>
              <button
                onClick={() => setShowOfferModal(true)}
                className={styles.actionBtn}
                disabled={loading}
              >
                🤝 Make Offer
              </button>
              <button
                onClick={() => setShowContactModal(true)}
                className={styles.actionBtn}
                disabled={loading}
              >
                💬 Contact Requestor
              </button>
            </div>
          )}

          <div className={styles.quickActions} style={{ marginTop: 8 }}>
            <ShareSection
              title={request.title}
              description={request.description}
              referenceType="REQUEST"
              referenceId={request.id}
              referenceTitle={request.title}
              referenceImage={request.imageUrl}
            />
          </div>

          {canRollback && (
            <div className={styles.quickActions}>
              <button
                onClick={() => setShowHistoryModal(true)}
                className={styles.actionBtn}
                disabled={loading}
              >
                ↩️ Rollback Status
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - OFFERS & COMMENTS */}
        <div className={styles.detailSidebar}>
          {/* OFFERS */}
          <div className={styles.sidebarCard}>
            <h2>🤝 Offers ({fulfillments.length})</h2>

            {canEdit && (
              <div className={styles.fulfillmentToggle}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={allowFulfillments}
                    onChange={handleToggleFulfillments}
                    disabled={loading}
                  />
                  <span className={styles.toggleText}>
                    {allowFulfillments ? 'Accepting offers' : 'Not accepting offers'}
                  </span>
                </label>
              </div>
            )}

            {allowFulfillments && !isOwnRequest && request.status === 'PENDING' && (
              <button
                onClick={() => setShowFulfillmentForm(!showFulfillmentForm)}
                className={styles.fulfillmentFormToggle}
              >
                {showFulfillmentForm ? 'Cancel' : 'Make an Offer'}
              </button>
            )}

            {showFulfillmentForm && (
              <form onSubmit={handleCreateFulfillment} className={styles.fulfillmentForm}>
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={fulfillmentForm.title}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, title: e.target.value })}
                    placeholder="Brief description of your offer"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Details</label>
                  <textarea
                    value={fulfillmentForm.content}
                    onChange={e => setFulfillmentForm({ ...fulfillmentForm, content: e.target.value })}
                    placeholder="Explain how you can fulfill this request..."
                    rows={4}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  Submit Offer
                </button>
              </form>
            )}

            <div className={styles.fulfillmentsList}>
              {fulfillments.map(f => (
                <div key={f.id} className={styles.fulfillmentItem}>
                  <div className={styles.fulfillmentHeader}>
                    <div className={styles.fulfillmentAuthor}>
                      <Link href={getUserProfileUrl(f.user)} className={styles.fulfillmentAuthorName}>
                        {f.user.name || 'User'}
                      </Link>
                      <span className={styles.fulfillmentDate}>
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`${styles.fulfillmentStatus} ${styles[`status${f.status.toLowerCase()}`]}`}>
                      {f.status}
                    </span>
                  </div>
                  <h4 className={styles.fulfillmentTitle}>{f.title}</h4>
                  <p className={styles.fulfillmentContent}>{f.content}</p>
                  {isOwnRequest && f.status === 'PENDING' && (
                    <div className={styles.fulfillmentActions}>
                      <button
                        onClick={() => handleRespondFulfillment(f.id, 'APPROVED')}
                        className={styles.fulfillmentApproveBtn}
                        disabled={loading}
                      >
                        \u2713 Accept
                      </button>
                      <button
                        onClick={() => handleRespondFulfillment(f.id, 'DECLINED')}
                        className={styles.fulfillmentDeclineBtn}
                        disabled={loading}
                      >
                        \u2715 Decline
                      </button>
                      <label className={styles.autoCompleteLabel}>
                        <input type="checkbox" id={`auto-${f.id}`} />
                        <span>Auto-complete request</span>
                      </label>
                    </div>
                  )}
                </div>
              ))}
              {fulfillments.length === 0 && (
                <p className={styles.noFulfillments}>No offers yet.</p>
              )}
            </div>
          </div>

          {/* COMMENTS */}
          <div className={styles.sidebarCard}>
            <h2>💬 Comments ({request.comments.length})</h2>

            <div className={styles.commentsList}>
              {request.comments.map(c => (
                <div key={c.id} className={styles.comment}>
                  <div className={styles.commentHeader}>
                    <Link href={getUserProfileUrl(c.user)} className={styles.commentAuthor}>
                      {c.user.name || 'User'}
                    </Link>
                    <span className={styles.commentDate}>
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={styles.commentContent}>{c.content}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddComment} className={styles.commentForm}>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <button type="submit" className="btn-primary" disabled={loading || !comment.trim()}>
                Add Comment
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* COMPLETE MODAL */}
      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🤝 Help Complete This Request</h2>
            <p className={styles.modalText}>
              You are offering to help {request.user.name || 'this user'} with this request.
              Mark it as completed and send them a message.
            </p>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={completeMessage}
                onChange={e => setCompleteMessage(e.target.value)}
                placeholder="Let them know how you can help..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleComplete}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY / ROLLBACK MODAL */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>📜 Request History</h2>
            <div className={styles.historyList}>
              <div className={styles.historyItem}>
                <span className={styles.historyIcon}>🕐</span>
                <div className={styles.historyContent}>
                  <span className={styles.historyAction}>
                    Request created with status <strong>PENDING</strong>
                  </span>
                  <span className={styles.historyDate}>
                    {new Date(request.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              {request.statusHistory?.map((change) => (
                <div key={change.id} className={styles.historyItem}>
                  <span className={styles.historyIcon}>\u2192</span>
                  <div className={styles.historyContent}>
                    <span className={styles.historyAction}>
                      <span className={styles.historyStatus}>{STATUS_LABELS[change.fromStatus]?.icon} {STATUS_LABELS[change.fromStatus]?.label}</span>
                      \u2192
                      <span className={styles.historyStatus}>{STATUS_LABELS[change.toStatus]?.icon} {STATUS_LABELS[change.toStatus]?.label}</span>
                      {change.reason && <span className={styles.historyReason}> - {change.reason}</span>}
                    </span>
                    <span className={styles.historyDate}>
                      {new Date(change.createdAt).toLocaleString()} by {change.changedByName}
                    </span>
                  </div>
                </div>
              ))}
              {(!request.statusHistory || request.statusHistory.length === 0) && (
                <p className={styles.noHistory}>No status changes recorded yet.</p>
              )}
            </div>
            {canRollback && (
              <div className={styles.rollbackSection}>
                <h3>Rollback to Previous Status</h3>
                <p className={styles.rollbackInfo}>Select a previous status to rollback to:</p>
                <div className={styles.historyOptions}>
                  {request.statusHistory?.map((change) => (
                    <button
                      key={change.id}
                      className={`${styles.historyOption} ${selectedHistory?.id === change.id ? styles.selected : ''}`}
                      onClick={() => setSelectedHistory(change)}
                    >
                      {STATUS_LABELS[change.fromStatus]?.icon} {STATUS_LABELS[change.fromStatus]?.label}
                    </button>
                  ))}
                </div>
                {selectedHistory && (
                  <div className="form-group">
                    <label>Reason for rollback (optional)</label>
                    <textarea
                      value={rollbackReason}
                      onChange={e => setRollbackReason(e.target.value)}
                      placeholder="Why are you rolling back this status?"
                      rows={2}
                    />
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => { setShowHistoryModal(false); setSelectedHistory(null); }}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRollback}
                    className="btn-primary"
                    disabled={loading || !selectedHistory}
                  >
                    {loading ? 'Rolling back...' : `Rollback to ${STATUS_LABELS[selectedHistory?.fromStatus || '']?.label}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💬 Contact Requestor</h2>
            <p className={styles.modalText}>
              Send a message to {request.user.name || 'this user'} about this request.
            </p>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder="Write your message..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContactMessage}
                className="btn-primary"
                disabled={loading || !contactMessage.trim()}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Request</h2>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={editForm.priority}
                  onChange={e => setEditForm({ ...editForm, priority: e.target.value })}
                >
                  {PRIORITIES.map(pri => (
                    <option key={pri.value} value={pri.value}>{pri.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Budget (optional)</label>
                <input
                  type="number"
                  value={editForm.budget}
                  onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Deadline (optional)</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={e => setEditForm({ ...editForm, deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={editForm.allowFulfillments}
                  onChange={e => setEditForm({ ...editForm, allowFulfillments: e.target.checked })}
                />
                <span className={styles.toggleText}>Allow others to make offers to fulfill this request</span>
              </label>
            </div>
            <div className="form-group">
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={editForm.showDonationAddress}
                  onChange={e => setEditForm({ ...editForm, showDonationAddress: e.target.checked })}
                />
                <span className={styles.toggleText}>Show donation addresses on this request</span>
              </label>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      <QRCodeModal
        isOpen={qrModal.open}
        onClose={() => setQrModal({ open: false, currency: '', address: '' })}
        currency={qrModal.currency}
        address={qrModal.address}
      />

      {/* SUPPORT MODAL */}
      {supportModalOpen && (
        <div className="modal-overlay" onClick={() => setSupportModalOpen(false)}>
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
              <button onClick={() => setSupportModalOpen(false)} className="btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* OFFER MODAL */}
      <MakeOfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        listingId={request.id}
        listingTitle={request.title}
        listingType="REQUEST"
        listingOwnerName={request.user.name || undefined}
      />
    </div>
  )
}
