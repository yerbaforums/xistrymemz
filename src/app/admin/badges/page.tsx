'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import Button from '@/components/ui/Button'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface BadgeUser {
  id: string
  name: string | null
  username: string | null
  image: string | null
}

interface Badge {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  tier: string
  createdAt: string
  user: BadgeUser
  awardedByUser: BadgeUser | null
}

const TIERS = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('ALL')
  const [form, setForm] = useState({ userId: '', name: '', tier: 'GOLD', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [editForm, setEditForm] = useState({ name: '', tier: 'GOLD', description: '' })
  const [confirmRevoke, setConfirmRevoke] = useState<Badge | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchBadges = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      let url = '/api/admin/badges'
      if (params.toString()) url += `?${params}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setBadges(data.data.badges)
      }
    } catch (err) {
      console.error('Failed to fetch badges:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBadges()
  }, [tierFilter])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBadges()
  }

  const handleAward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.userId || !form.name) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        showToast('Badge awarded!', 'success')
        setForm({ userId: '', name: '', tier: 'GOLD', description: '' })
        fetchBadges()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to award badge', 'error')
      }
    } catch {
      showToast('Failed to award badge', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (badgeId: string) => {
    setRevoking(badgeId)
    try {
      const res = await fetch(`/api/admin/badges/${badgeId}`, { method: 'DELETE' })
      if (res.ok) {
        setBadges(badges.filter(b => b.id !== badgeId))
        showToast('Badge revoked', 'success')
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to revoke badge', 'error')
      }
    } catch {
      showToast('Failed to revoke badge', 'error')
    } finally {
      setRevoking(null)
      setConfirmRevoke(null)
    }
  }

  const openEdit = (badge: Badge) => {
    setEditing(badge)
    setEditForm({ name: badge.name, tier: badge.tier, description: badge.description || '' })
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/badges/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        showToast('Badge updated!', 'success')
        setEditing(null)
        fetchBadges()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to update badge', 'error')
      }
    } catch {
      showToast('Failed to update badge', 'error')
    } finally {
      setSavingEdit(false)
    }
  }

  const visibleBadges = badges.filter(b => tierFilter === 'ALL' || b.tier === tierFilter)

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.message}
        </div>
      )}

      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Badges' }]} />
      <div className={styles.header}>
        <div>
          <h1>Badge Management</h1>
          <p className={styles.subtitle}>{badges.length} total badges</p>
        </div>
      </div>

      <form onSubmit={handleAward} className={styles.awardForm}>
        <div className={styles.formGroup}>
          <label>User (id or username)</label>
          <input
            type="text"
            value={form.userId}
            onChange={e => setForm({ ...form, userId: e.target.value })}
            className={styles.formInput}
            placeholder="user id or username"
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label>Badge Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className={styles.formInput}
            placeholder="e.g. TRUSTED_SELLER"
            required
          />
        </div>
        <div className={styles.formGroup} style={{ maxWidth: 150 }}>
          <label>Tier</label>
          <select
            value={form.tier}
            onChange={e => setForm({ ...form, tier: e.target.value })}
            className={styles.formInput}
          >
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <input
            type="text"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className={styles.formInput}
            placeholder="Optional description"
          />
        </div>
        <button type="submit" disabled={submitting} className={styles.submitBtn}>
          {submitting ? 'Awarding...' : 'Award Badge'}
        </button>
      </form>

      <div className={styles.toolbar}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            placeholder="Filter by user name"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </form>
        <select
          value={tierFilter}
          onChange={e => setTierFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="ALL">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Button onClick={fetchBadges} variant="secondary">Refresh</Button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading badges...</div>
      ) : visibleBadges.length === 0 ? (
        <EmptyState icon="🏅" title="No badges found" description="Award badges to users to reward quality contributions." />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Badge</th>
                <th>Tier</th>
                <th>Description</th>
                <th>Awarded By</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleBadges.map(badge => (
                <tr key={badge.id}>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.avatar}>
                        {badge.user.image ? (
                          <Image src={badge.user.image} alt={badge.user.name || 'User'} fill sizes="32px" />
                        ) : (
                          <span>{(badge.user.name?.[0] || 'U').toUpperCase()}</span>
                        )}
                      </div>
                      <div className={styles.userDetail}>
                        <span className={styles.userName}>{badge.user.name || '—'}</span>
                        {badge.user.username && <span className={styles.userEmail}>@{badge.user.username}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      {badge.imageUrl && (
                        <img src={badge.imageUrl} alt="" width={18} height={18} style={{ borderRadius: '50%' }} />
                      )}
                      {badge.name}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.tierBadge}
                      style={{
                        color: TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE,
                        background: `${TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE}22`,
                        border: `1px solid ${TIER_COLORS[badge.tier] || TIER_COLORS.BRONZE}66`,
                      }}
                    >
                      {badge.tier}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 240 }}>
                    {badge.description || '—'}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {badge.awardedByUser?.name || 'System'}
                    </span>
                  </td>
                  <td>
                    <span className={styles.date}>
                      {new Date(badge.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button onClick={() => openEdit(badge)} className={styles.editBtn}>Edit</button>
                      <button
                        onClick={() => setConfirmRevoke(badge)}
                        disabled={revoking === badge.id}
                        className={styles.revokeBtn}
                      >
                        {revoking === badge.id ? '...' : 'Revoke'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Edit Badge</h2>
            <form onSubmit={handleEditSave} className={styles.awardForm} style={{ border: 'none', padding: 0, marginBottom: 0, alignItems: 'stretch' }}>
              <div className={styles.formGroup}>
                <label>Badge Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className={styles.formInput}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tier</label>
                <select
                  value={editForm.tier}
                  onChange={e => setEditForm({ ...editForm, tier: e.target.value })}
                  className={styles.formInput}
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className={styles.formInput}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setEditing(null)} className={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={savingEdit} className={styles.submitBtn}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={() => { if (confirmRevoke) handleRevoke(confirmRevoke.id) }}
        title="Revoke Badge"
        message={`Are you sure you want to revoke the ${confirmRevoke?.name || 'this'} badge from ${confirmRevoke?.user.name || confirmRevoke?.user.username || 'this user'}?`}
        confirmLabel="Revoke Badge"
        variant="danger"
      />
    </div>
  )
}
