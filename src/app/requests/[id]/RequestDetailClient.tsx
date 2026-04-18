'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

const CATEGORIES = [
  { value: 'GENERAL', label: 'General', icon: '📋' },
  { value: 'HELP', label: 'Help Needed', icon: '🆘' },
  { value: 'COLLABORATION', label: 'Collaboration', icon: '🤝' },
  { value: 'SUPPORT', label: 'Support', icon: '💪' },
  { value: 'RESOURCES', label: 'Resources', icon: '📦' },
  { value: 'FEEDBACK', label: 'Feedback', icon: '💬' },
  { value: 'IDEA', label: 'Idea', icon: '💡' },
  { value: 'BUG', label: 'Bug Report', icon: '🐛' },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#888' },
  { value: 'MEDIUM', label: 'Medium', color: '#fa0' },
  { value: 'HIGH', label: 'High', color: '#f36' },
  { value: 'URGENT', label: 'Urgent', color: '#ff0000' },
]

const STATUS_LABELS: Record<string, { label: string, icon: string }> = {
  PENDING: { label: 'Pending', icon: '⏳' },
  APPROVED: { label: 'Approved', icon: '✅' },
  REJECTED: { label: 'Rejected', icon: '❌' },
  COMPLETED: { label: 'Completed', icon: '🎉' },
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
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
  likes: number
  reposts: number
  createdAt: string
  updatedAt: string
  completedBy: string | null
  completedAt: string | null
  plan: {
    id: string
    title: string
    user: {
      id: string
      name: string | null
      email: string
    }
  } | null
  user: {
    id: string
    name: string | null
    email: string
  }
  product?: Product | null
  comments: Comment[]
  statusHistory?: StatusChange[]
}

interface RequestDetailClientProps {
  request: Request
  userId: string
}

export default function RequestDetailClient({ request: initialRequest, userId }: RequestDetailClientProps) {
  const [request, setRequest] = useState(initialRequest)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<StatusChange | null>(null)
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const [completeMessage, setCompleteMessage] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')
  const [editForm, setEditForm] = useState({
    title: initialRequest.title,
    description: initialRequest.description || '',
    category: initialRequest.category,
    priority: initialRequest.priority,
    budget: initialRequest.budget?.toString() || '',
    deadline: initialRequest.deadline ? initialRequest.deadline.split('T')[0] : '',
  })

  const isPlanOwner = request.plan?.user.id === userId
  const isOwnRequest = request.user.id === userId
  const canPurchase = request.product && request.status === 'PENDING' && !isOwnRequest
  const canPurchaseSelf = request.product && request.status === 'PENDING' && isOwnRequest
  const canComplete = request.status === 'PENDING' && !isOwnRequest
  const canEdit = isOwnRequest && request.status === 'PENDING'
  const canRollback = isPlanOwner && request.status !== 'PENDING'
  const canViewHistory = (isPlanOwner || isOwnRequest) && request.statusHistory && request.statusHistory.length > 0
  const canApprove = request.plan && request.status === 'PENDING'
  const category = CATEGORIES.find(c => c.value === request.category) || CATEGORIES[0]
  const priority = PRIORITIES.find(p => p.value === request.priority) || PRIORITIES[1]

  const handleApprove = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/approve`, { method: 'POST' })
      if (res.ok) {
        const updated = { ...request, status: 'APPROVED' }
        setRequest(updated)
        addToHistory('PENDING', 'APPROVED', 'Request approved by project owner')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
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
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: purchaseMessage })
      })
      
      if (res.ok) {
        setShowPurchaseModal(false)
        setPurchaseMessage('')
        setRequest({ ...request, status: 'APPROVED' })
        addToHistory('PENDING', 'APPROVED', 'Item purchased on behalf of requester')
      }
    } catch (error) {
      console.error('Failed to purchase:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelfPurchase = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED', completedBy: userId })
      })
      
      if (res.ok) {
        setRequest({ 
          ...request, 
          status: 'COMPLETED',
          completedBy: userId,
          completedAt: new Date().toISOString()
        })
        addToHistory(request.status, 'COMPLETED', 'Self-completed by requester')
      }
    } catch (error) {
      console.error('Failed to self-purchase:', error)
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
    } catch (error) {
      console.error('Failed to complete:', error)
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
    } catch (error) {
      console.error('Failed to rollback:', error)
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
        })
      }
    } catch (error) {
      console.error('Failed to edit:', error)
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
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link href="/requests" className={styles.backLink}>
        ← Back to Requests
      </Link>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.card}>
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
              </div>
            </div>

            <div className={styles.titleRow}>
              <h1 className={styles.title}>{request.title}</h1>
              {canEdit && (
                <button onClick={() => setShowEditModal(true)} className={styles.editBtn}>
                  ✏️ Edit
                </button>
              )}
            </div>
            
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
                <Link href={`/profile/${request.user.id}`} className={styles.metaValue}>
                  {request.user.name || request.user.email}
                </Link>
              </div>
              {request.plan && (
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Project owner</span>
                  <Link href={`/profile/${request.plan.user.id}`} className={styles.metaValue}>
                    {request.plan.user.name || request.plan.user.email}
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
                  <Link href={`/profile/${request.completedBy}`} className={styles.metaValue}>
                    {request.completedBy === request.user.id ? 'Requester (Self)' : 'Helper'}
                  </Link>
                </div>
              )}
            </div>

            {canApprove && (
              <div className={styles.actions}>
                <button 
                  onClick={handleApprove} 
                  className={styles.approveBtn}
                  disabled={loading}
                >
                  ✅ Approve
                </button>
                <button 
                  onClick={handleReject} 
                  className={styles.rejectBtn}
                  disabled={loading}
                >
                  ❌ Reject
                </button>
              </div>
            )}

            {canPurchase && (
              <div className={styles.actions}>
                <button 
                  onClick={() => setShowPurchaseModal(true)} 
                  className={styles.approveBtn}
                  disabled={loading}
                >
                  🛒 Purchase on Their Behalf
                </button>
              </div>
            )}

            {canPurchaseSelf && (
              <div className={styles.actions}>
                <button 
                  onClick={handleSelfPurchase} 
                  className={styles.completeBtn}
                  disabled={loading}
                >
                  ✅ Mark as Purchased/Completed
                </button>
              </div>
            )}

            {canComplete && !request.product && (
              <div className={styles.actions}>
                <button 
                  onClick={() => setShowCompleteModal(true)} 
                  className={styles.helpBtn}
                  disabled={loading}
                >
                  🤝 Help Complete This Request
                </button>
              </div>
            )}

            {canRollback && (
              <div className={styles.actions}>
                <button 
                  onClick={() => setShowHistoryModal(true)} 
                  className={styles.rollbackBtn}
                  disabled={loading}
                >
                  ↩️ Rollback Status
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.commentsSection}>
          <h2>💬 Comments ({request.comments.length})</h2>

          <div className={styles.commentsList}>
            {request.comments.map(c => (
              <div key={c.id} className={styles.comment}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>
                    {c.user.name || c.user.email}
                  </span>
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
              placeholder="Add a comment or offer help..."
              rows={3}
            />
            <button type="submit" className="btn-primary" disabled={loading || !comment.trim()}>
              Add Comment
            </button>
          </form>
        </div>
      </div>

      {showPurchaseModal && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🛒 Purchase on Their Behalf</h2>
            <p className={styles.modalText}>
              You are purchasing <strong>{request.product?.title}</strong> for {request.user.name || request.user.email}.
              This will approve the request and send them a message.
            </p>
            <div className="form-group">
              <label>Message (optional)</label>
              <textarea
                value={purchaseMessage}
                onChange={e => setPurchaseMessage(e.target.value)}
                placeholder="Add a message to go along with your purchase..."
                rows={3}
              />
            </div>
            <div className={styles.modalActions}>
              <button 
                type="button" 
                onClick={() => setShowPurchaseModal(false)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handlePurchase}
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : `Purchase $${request.product?.price?.toFixed(2) || '0.00'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🤝 Help Complete This Request</h2>
            <p className={styles.modalText}>
              You are offering to help {request.user.name || request.user.email} with this request.
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
                  <span className={styles.historyIcon}>→</span>
                  <div className={styles.historyContent}>
                    <span className={styles.historyAction}>
                      <span className={styles.historyStatus}>{STATUS_LABELS[change.fromStatus]?.icon} {STATUS_LABELS[change.fromStatus]?.label}</span>
                      → 
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Request</h2>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={editForm.title}
                onChange={e => setEditForm({...editForm, title: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editForm.description}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
                rows={4}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={editForm.category}
                  onChange={e => setEditForm({...editForm, category: e.target.value})}
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
                  onChange={e => setEditForm({...editForm, priority: e.target.value})}
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
                  onChange={e => setEditForm({...editForm, budget: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label>Deadline (optional)</label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={e => setEditForm({...editForm, deadline: e.target.value})}
                />
              </div>
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
    </div>
  )
}
