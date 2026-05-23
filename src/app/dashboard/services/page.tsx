'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import styles from './page.module.css'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const EMPTY_FORM = {
  title: '',
  description: '',
  category: 'OTHER' as ServiceCategory,
  duration: 60,
  price: '',
  location: '',
  meetingLink: '',
  imageUrl: '',
}

export default function DashboardServices() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error: toastError } = useToast()

  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
    if (status !== 'authenticated') return
    fetchServices()
  }, [status])

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services/user')
      const data = await res.json()
      setServices(data.services || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (s: ServiceOffering) => {
    setForm({
      title: s.title,
      description: s.description || '',
      category: s.category as ServiceCategory,
      duration: s.duration,
      price: s.price?.toString() || '',
      location: s.location || '',
      meetingLink: s.meetingLink || '',
      imageUrl: s.imageUrl || '',
    })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toastError('Title is required')
      return
    }
    setSaving(true)
    try {
      const body = {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        meetingLink: form.meetingLink || null,
        imageUrl: form.imageUrl || null,
      }

      const url = editingId ? `/api/services/${editingId}` : '/api/services'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        success(editingId ? 'Service updated!' : 'Service created!')
        resetForm()
        fetchServices()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to save')
      }
    } catch {
      toastError('Failed to save service')
    }
    setSaving(false)
  }

  const handleToggleActive = async (s: ServiceOffering) => {
    try {
      const res = await fetch(`/api/services/${s.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !s.isActive }),
      })
      if (res.ok) {
        success(s.isActive ? 'Service hidden' : 'Service published')
        fetchServices()
      }
    } catch {
      toastError('Failed to update')
    }
  }

  const handleDelete = async (s: ServiceOffering) => {
    if (!confirm(`Delete "${s.title}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/services/${s.id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Service deleted')
        fetchServices()
      }
    } catch {
      toastError('Failed to delete')
    }
  }

  const filteredServices = services.filter(s => {
    if (filter === 'active') return s.isActive
    if (filter === 'inactive') return !s.isActive
    return true
  })

  if (status === 'loading') {
    return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Services</h1>
          <p className={styles.subtitle}>Manage your bookable services</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className={styles.createBtn}
        >
          + New Service
        </button>
      </div>

      {!showForm && (
        <div className={styles.controls}>
          <div className={styles.filterPills}>
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
                {' '}({f === 'all' ? services.length : services.filter(s => f === 'active' ? s.isActive : !s.isActive).length})
              </button>
            ))}
          </div>
        </div>
      )}

      {showForm ? (
        <div className={styles.formSection}>
          <div className={styles.formHeader}>
            <h3>{editingId ? 'Edit Service' : 'New Service'}</h3>
            <button onClick={resetForm} className={styles.closeBtn}>✕</button>
          </div>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. 1-Hour Guitar Lesson" required />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value as ServiceCategory})}>
                  {SERVICE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{SERVICE_CATEGORY_ICONS[cat]} {SERVICE_CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Duration (minutes) *</label>
                <input type="number" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value) || 60})} min={5} step={5} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Price ($)</label>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" step="0.01" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} placeholder="Describe what you offer..." />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Location</label>
                <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, State or address" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Meeting Link</label>
                <input type="url" value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Image URL</label>
                <input type="url" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Service'}
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
        <div className={styles.loading}>Loading your services...</div>
      ) : filteredServices.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No services yet.</p>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">Create Your First Service</button>
        </div>
      ) : (
        <div className={styles.list}>
          {filteredServices.map(s => {
            const cat = s.category as ServiceCategory
            return (
              <div key={s.id} className={styles.card}>
                <div className={styles.cardImage}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.title} />
                  ) : (
                    <div className={styles.cardImagePlaceholder}>{SERVICE_CATEGORY_ICONS[cat] || '📋'}</div>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardHeader}>
                    <h4>{s.title}</h4>
                    <span className={`badge ${s.isActive ? 'badge-published' : 'badge-draft'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={`badge badge-category`}>{SERVICE_CATEGORY_ICONS[cat]} {SERVICE_CATEGORY_LABELS[cat]}</span>
                    <span>🕐 {formatDuration(s.duration)}</span>
                    {s.price != null && <span>💰 ${s.price}</span>}
                    {s.location && <span>📍 {s.location}</span>}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button onClick={() => startEdit(s)} className={styles.actionBtn} title="Edit">✏️</button>
                  <button onClick={() => handleToggleActive(s)} className={styles.actionBtn} title={s.isActive ? 'Deactivate' : 'Activate'}>
                    {s.isActive ? '🕶️' : '✅'}
                  </button>
                  <button onClick={() => handleDelete(s)} className={styles.actionBtn} title="Delete">🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
