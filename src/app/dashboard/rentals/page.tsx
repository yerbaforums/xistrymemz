'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { useToast } from '@/context/ToastContext'
import styles from './rentals.module.css'

interface RentalItem {
  id: string
  title: string
  description: string | null
  price: number | null
  rentalDaily: number | null
  rentalWeekly: number | null
  rentalMonthly: number | null
  rentalDeposit: number | null
  rentalMinDays: number
  rentalMaxDays: number | null
  rentalAvailable: boolean
  category: string | null
  location: string | null
  isGlobal: boolean
  imageUrl: string | null
  published: boolean
  createdAt: string
}

export default function RentalsPage() {
  const { success, error } = useToast()
  const [rentals, setRentals] = useState<RentalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<RentalItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'available' | 'unavailable'>('all')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    rentalDaily: '',
    rentalWeekly: '',
    rentalMonthly: '',
    rentalDeposit: '',
    rentalMinDays: '1',
    rentalMaxDays: '',
    rentalAvailable: true,
    category: '',
    location: '',
    isGlobal: false,
    imageUrl: '',
    published: true,
  })

  useEffect(() => { fetchRentals() }, [])

  const fetchRentals = async () => {
    try {
      const res = await fetch('/api/products/user?type=RENTAL')
      const data = await res.json()
      setRentals(Array.isArray(data) ? data : data?.products || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      title: '', description: '', rentalDaily: '', rentalWeekly: '',
      rentalMonthly: '', rentalDeposit: '', rentalMinDays: '1',
      rentalMaxDays: '', rentalAvailable: true, category: '',
      location: '', isGlobal: false, imageUrl: '', published: true,
    })
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (r: RentalItem) => {
    setForm({
      title: r.title,
      description: r.description || '',
      rentalDaily: r.rentalDaily?.toString() || '',
      rentalWeekly: r.rentalWeekly?.toString() || '',
      rentalMonthly: r.rentalMonthly?.toString() || '',
      rentalDeposit: r.rentalDeposit?.toString() || '',
      rentalMinDays: r.rentalMinDays.toString(),
      rentalMaxDays: r.rentalMaxDays?.toString() || '',
      rentalAvailable: r.rentalAvailable,
      category: r.category || '',
      location: r.location || '',
      isGlobal: r.isGlobal,
      imageUrl: r.imageUrl || '',
      published: r.published,
    })
    setEditing(r)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        type: 'RENTAL',
        price: form.rentalDaily ? parseFloat(form.rentalDaily) : null,
        rentalDaily: form.rentalDaily ? parseFloat(form.rentalDaily) : null,
        rentalWeekly: form.rentalWeekly ? parseFloat(form.rentalWeekly) : null,
        rentalMonthly: form.rentalMonthly ? parseFloat(form.rentalMonthly) : null,
        rentalDeposit: form.rentalDeposit ? parseFloat(form.rentalDeposit) : null,
        rentalMinDays: parseInt(form.rentalMinDays) || 1,
        rentalMaxDays: form.rentalMaxDays ? parseInt(form.rentalMaxDays) : null,
        paymentType: 'BOTH',
        acceptsOffers: true,
      }
      const url = editing ? `/api/products/${editing.id}` : '/api/products'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        success(editing ? 'Rental updated!' : 'Rental created!')
        fetchRentals()
        resetForm()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save')
      }
    } catch {
      error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) { success('Deleted'); fetchRentals() }
      else error('Failed to delete')
    } catch { error('Failed to delete') }
  }

  const handleToggle = async (id: string, field: string, value: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value })
    })
    if (res.ok) { fetchRentals(); success('Updated') }
    else error('Failed')
  }

  const filtered = rentals.filter(r => {
    if (filter === 'published' && !r.published) return false
    if (filter === 'draft' && r.published) return false
    if (filter === 'available' && !r.rentalAvailable) return false
    if (filter === 'unavailable' && r.rentalAvailable) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const formatPrice = (val: number | null) => val ? `$${val}` : '—'

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Rentals' }]} />
      <div className={styles.header}>
        <div>
          <h1>🏠 Rentals</h1>
          <p className={styles.welcome}>Manage your rental listings</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">➕ Add Rental</button>
      </div>

      <div className={styles.filters}>
        <input type="text" placeholder="Search rentals..." value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <span className={styles.count}>{filtered.length} items</span>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : filtered.length === 0 && !showForm ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏠</div>
          <h3>No rental listings yet</h3>
          <p>List tools, equipment, spaces, or anything you want to rent out.</p>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">➕ Add Your First Rental</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(r => (
            <div key={r.id} className={styles.card}>
              <div className={styles.cardImage}>
                {r.imageUrl ? <img src={r.imageUrl} alt={r.title} /> : <div className={styles.imgPlaceholder}>🏠</div>}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <h3>{r.title}</h3>
                  <span className={`badge ${r.published ? 'badge-published' : 'badge-draft'}`}>
                    {r.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className={styles.pricing}>
                  {r.rentalDaily && <span className={styles.priceTag}>${r.rentalDaily}/day</span>}
                  {r.rentalWeekly && <span className={styles.priceTag}>${r.rentalWeekly}/wk</span>}
                  {r.rentalMonthly && <span className={styles.priceTag}>${r.rentalMonthly}/mo</span>}
                  {r.rentalDeposit && <span className={styles.deposit}>Deposit: ${r.rentalDeposit}</span>}
                </div>
                <div className={styles.meta}>
                  <span>{r.isGlobal ? '🌍 Global' : `📍 ${r.location || 'Local'}`}</span>
                  <span>Min {r.rentalMinDays} day{r.rentalMinDays > 1 ? 's' : ''}</span>
                  {r.rentalMaxDays && <span>Max {r.rentalMaxDays} days</span>}
                  <span className={r.rentalAvailable ? styles.available : styles.unavailable}>
                    {r.rentalAvailable ? '✓ Available' : '✕ Unavailable'}
                  </span>
                </div>
              </div>
              <div className={styles.actions}>
                <button onClick={() => startEdit(r)} className={styles.editBtn}>✏️</button>
                <button onClick={() => handleToggle(r.id, 'rentalAvailable', !r.rentalAvailable)} className={styles.toggleBtn}>
                  {r.rentalAvailable ? '🔴' : '🟢'}
                </button>
                <button onClick={() => handleToggle(r.id, 'published', !r.published)} className={styles.toggleBtn}>
                  {r.published ? '👁️' : '✅'}
                </button>
                <button onClick={() => handleDelete(r.id, r.title)} className={styles.deleteBtn}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>{editing ? '✏️ Edit Rental' : '➕ Add Rental Listing'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="What are you renting?" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Describe the item, condition, and rental terms..." />
              </div>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Daily Price</label>
                  <input type="number" value={form.rentalDaily} onChange={e => setForm({...form, rentalDaily: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Weekly Price</label>
                  <input type="number" value={form.rentalWeekly} onChange={e => setForm({...form, rentalWeekly: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Monthly Price</label>
                  <input type="number" value={form.rentalMonthly} onChange={e => setForm({...form, rentalMonthly: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Deposit</label>
                  <input type="number" value={form.rentalDeposit} onChange={e => setForm({...form, rentalDeposit: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Min Days</label>
                  <input type="number" value={form.rentalMinDays} onChange={e => setForm({...form, rentalMinDays: e.target.value})} min="1" />
                </div>
                <div className="form-group">
                  <label>Max Days (optional)</label>
                  <input type="number" value={form.rentalMaxDays} onChange={e => setForm({...form, rentalMaxDays: e.target.value})} min="1" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className="form-group">
                  <label>Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g., Tools, Space, Vehicle" />
                </div>
                <div className="form-group">
                  <label>Image URL</label>
                  <input type="text" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
              </div>
              <div className="form-group">
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.isGlobal} onChange={e => setForm({...form, isGlobal: e.target.checked})} />
                  Available globally (no location restriction)
                </label>
              </div>
              {!form.isGlobal && (
                <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="City, State" />
                </div>
              )}
              <div className={styles.checkGroup}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.rentalAvailable} onChange={e => setForm({...form, rentalAvailable: e.target.checked})} />
                  Available for rent
                </label>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.published} onChange={e => setForm({...form, published: e.target.checked})} />
                  Publish now
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Rental'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
