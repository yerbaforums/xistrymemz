'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { useSiteSettings } from '@/hooks/useSiteSettings'

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
  likes: number
  reposts: number
  isPublic: boolean
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
  }
}

interface RequestsClientProps {
  initialRequests: Request[]
  userId: string
  userRole?: string
}

export default function RequestsClient({ initialRequests, userId, userRole = 'USER' }: RequestsClientProps) {
  const settings = useSiteSettings()
  const [requests, setRequests] = useState(initialRequests)
  const [filter, setFilter] = useState('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: 'FUNDING',
    priority: 'MEDIUM',
    budget: '',
    goalAmount: '',
    payoutAddress: '',
    payoutCurrency: 'ETH',
    location: '',
    isPublic: true
  })
  const [creating, setCreating] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [editGoalAmount, setEditGoalAmount] = useState('')
  const [savingGoal, setSavingGoal] = useState(false)
  const [contributeRequest, setContributeRequest] = useState<Request | null>(null)
  const [contributeAmount, setContributeAmount] = useState('')
  const [contributing, setContributing] = useState(false)
  const [copiedPayout, setCopiedPayout] = useState(false)

  const filteredRequests = filter === 'ALL' 
    ? requests 
    : requests.filter(r => r.status === filter)

  const handleCreate = async () => {
    if (!newRequest.title.trim()) {
      alert('Please enter a title')
      return
    }
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
        setRequests([{ ...created, user: { id: userId, name: null, email: '', image: null } }, ...requests])
        setShowCreate(false)
        setNewRequest({ title: '', description: '', category: 'FUNDING', priority: 'MEDIUM', budget: '', goalAmount: '', payoutAddress: '', payoutCurrency: 'ETH', location: '', isPublic: true })
      }
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleSaveGoal = async (id: string) => {
    setSavingGoal(true)
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalAmount: editGoalAmount ? parseFloat(editGoalAmount) : 0
        })
      })
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, goalAmount: parseFloat(editGoalAmount) || 0 } : r))
        setEditingGoalId(null)
        setEditGoalAmount('')
      }
    } catch (error) {
      console.error('Failed to save goal:', error)
    } finally {
      setSavingGoal(false)
    }
  }

  const handleContribute = async () => {
    if (!contributeRequest || !contributeAmount) return
    setContributing(true)
    try {
      const res = await fetch(`/api/requests/${contributeRequest.id}/contribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(contributeAmount)
        })
      })
      if (res.ok) {
        const updated = await res.json()
        setRequests(requests.map(r => r.id === contributeRequest.id ? { 
          ...r, 
          currentFunding: (r.currentFunding || 0) + parseFloat(contributeAmount) 
        } : r))
        setContributeRequest(null)
        setContributeAmount('')
        alert('Contribution successful!')
      }
    } catch (error) {
      console.error('Failed to contribute:', error)
    } finally {
      setContributing(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/approve`, { method: 'POST' })
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r))
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/requests/${id}/reject`, { method: 'POST' })
      if (res.ok) {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r))
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this request?')) return
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRequests(requests.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  const isAdmin = userRole === 'ADMIN'

  const getLinkInfo = (req: Request) => {
    if (req.plan) return { type: 'Plan', label: req.plan.title, href: `/plans/${req.plan.id}`, color: '#00d9ff' }
    if (req.group) return { type: 'Group', label: req.group.name, href: `/groups/${req.group.id}`, color: '#a855f7' }
    if (req.product) return { type: 'Product', label: req.product.title, href: `/products/${req.product.id}`, color: '#22c55e' }
    if (req.schoolContent) return { type: 'School', label: req.schoolContent.title, href: `/schools`, color: '#f59e0b' }
    if (req.event) return { type: 'Event', label: req.event.title, href: `/events/${req.event.id}`, color: '#ef4444' }
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Requests</h1>
          <p className={styles.subtitle}>
            {isAdmin ? 'All requests (Admin)' : 'Create and manage your requests'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/requests/public" className="btn-secondary">Browse Public</Link>
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
              <option value="FUNDING">Community Funding</option>
              <option value="GENERAL">General</option>
              <option value="HELP">Help Needed</option>
              <option value="COLLABORATION">Collaboration</option>
              <option value="SUPPORT">Support</option>
              <option value="RESOURCES">Resources</option>
              <option value="FEEDBACK">Feedback</option>
              <option value="IDEA">Idea</option>
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
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
              placeholder="Goal Amount ($)"
              value={newRequest.goalAmount}
              onChange={e => setNewRequest({ ...newRequest, goalAmount: e.target.value })}
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
          <div className={styles.formRow}>
            <select
              value={newRequest.payoutCurrency}
              onChange={e => setNewRequest({ ...newRequest, payoutCurrency: e.target.value })}
              className={styles.select}
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="XMR">XMR</option>
              <option value="XTM">XTM</option>
              <option value="ARRR">ARRR</option>
              <option value="DERO">DERO</option>
              <option value="ZANO">ZANO</option>
              <option value="OTHER">OTHER</option>
            </select>
            <input
              type="text"
              placeholder="Payout address (or leave blank for profile default)"
              value={newRequest.payoutAddress}
              onChange={e => setNewRequest({ ...newRequest, payoutAddress: e.target.value })}
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

      <div className={styles.filters}>
        {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredRequests.length === 0 ? (
        <div className={styles.empty}>
          <p>No requests found</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Your First Request</button>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredRequests.map(req => {
            const isOwner = req.user.id === userId
            const link = getLinkInfo(req)
            return (
              <div key={req.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                  <span className={`badge badge-${req.priority.toLowerCase()}`}>{req.priority}</span>
                  {link && (
                    <Link href={link.href} className={styles.linkBadge} style={{ backgroundColor: link.color + '20', color: link.color }}>
                      {link.type}: {link.label}
                    </Link>
                  )}
                  {!link && <span className={styles.standalone}>Standalone</span>}
                  {req.isPublic && <span className={styles.publicBadge}>🌐 Public</span>}
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
                
                {req.description && <p className={styles.cardDesc}>{req.description}</p>}
                
                {(req.goalAmount || 0) > 0 && (
                  <div className={styles.fundingProgress}>
                    <div className={styles.fundingHeader}>
                      <span>💝 ${req.currentFunding || 0} raised</span>
                      <span>of ${req.goalAmount} goal</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${Math.min(((req.currentFunding || 0) / (req.goalAmount || 1)) * 100, 100)}%` }}
                      />
                    </div>
                    
                    {editingGoalId === req.id ? (
                      <div className={styles.editControls}>
                        <input
                          type="range"
                          min="0"
                          max="10000"
                          step="100"
                          value={editGoalAmount || req.goalAmount || 0}
                          onChange={e => setEditGoalAmount(e.target.value)}
                          className={styles.slider}
                        />
                        <input
                          type="number"
                          value={editGoalAmount || req.goalAmount || 0}
                          onChange={e => setEditGoalAmount(e.target.value)}
                          className={styles.input}
                          placeholder="Goal amount"
                        />
                        <div className={styles.editActions}>
                          <button onClick={() => handleSaveGoal(req.id)} disabled={savingGoal} className="btn-primary">
                            {savingGoal ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => { setEditingGoalId(null); setEditGoalAmount('') }} className="btn-ghost">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : isOwner ? (
                      <button onClick={() => { setEditingGoalId(req.id); setEditGoalAmount(req.goalAmount?.toString() || '') }} className={styles.editGoalBtn}>
                        Edit Goal
                      </button>
                    ) : null}

                    {settings.settings.enableCheckout ? (
                      <button onClick={() => setContributeRequest(req)} className={styles.contributeBtn}>
                        Contribute
                      </button>
                    ) : req.payoutAddress ? (
                      <div className={styles.payoutCard}>
                        <p className={styles.payoutCrypto}>Crypto: {req.payoutCurrency || 'ETH'}</p>
                        <div className={styles.payoutAddress}>
                          <code>{req.payoutAddress}</code>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(req.payoutAddress || '')
                              setCopiedPayout(true)
                              setTimeout(() => setCopiedPayout(false), 2000)
                            }}
                            className={styles.copyPayoutBtn}
                          >
                            {copiedPayout ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        <p className={styles.payoutHint}>Send {req.payoutCurrency || 'ETH'} to contribute</p>
                      </div>
                    ) : null}
                  </div>
                )}
                
                <div className={styles.cardMeta}>
                  <span>👤 {req.user.name || req.user.email}</span>
                  {req.budget && <span>💰 ${req.budget}</span>}
                  {req.location && <span>📍 {req.location}</span>}
                  <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {contributeRequest && (
        <div className="modal-overlay" onClick={() => setContributeRequest(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>💝 Contribute to Request</h2>
            <p className={styles.planModalDesc}>
              Help fund <strong>{contributeRequest.title}</strong>
            </p>
            <div className={styles.escrowSummary}>
              <div className={styles.escrowRow}>
                <span>Goal:</span>
                <strong>${contributeRequest.goalAmount}</strong>
              </div>
              <div className={styles.escrowRow}>
                <span>Raised:</span>
                <strong>${contributeRequest.currentFunding || 0}</strong>
              </div>
            </div>
            <div className="form-group">
              <label>Contribution Amount</label>
              <input
                type="number"
                value={contributeAmount}
                onChange={e => setContributeAmount(e.target.value)}
                placeholder="Enter amount..."
                min="1"
                step="0.01"
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setContributeRequest(null)} className="btn-ghost">Cancel</button>
              <button 
                onClick={handleContribute} 
                disabled={contributing || !contributeAmount || parseFloat(contributeAmount) <= 0}
                className="btn-primary"
              >
                {contributing ? 'Processing...' : 'Contribute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}