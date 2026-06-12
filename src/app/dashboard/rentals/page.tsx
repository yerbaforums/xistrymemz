'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import ImageUploader from '@/components/ImageUploader'
import styles from './rentals.module.css'
import Skeleton from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'

interface ShopSettings {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string | null
  email: string | null
  name: string | null
}

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
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [showShopModal, setShowShopModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'delete-item' | 'unpublish-shop' | 'delete-shop' | null>(null)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [shopForm, setShopForm] = useState({
    shopName: '', shopAbout: '', shopImage: '', shopImages: [] as string[],
    shopSlug: '', email: '', name: ''
  })
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
    imageUrls: [] as string[],
    published: true,
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [rentalsRes, shopRes] = await Promise.all([
        fetch('/api/products/user?type=RENTAL'),
        fetch('/api/shop')
      ])
      const rentalsData = await rentalsRes.json()
      const shopData = await shopRes.json()
      setRentals(Array.isArray(rentalsData) ? rentalsData : rentalsData?.products || [])
      setShopSettings(shopData)
      setShopForm({
        shopName: shopData.shopName || '',
        shopAbout: shopData.shopAbout || '',
        shopImage: shopData.shopImage || '',
        shopImages: shopData.shopImage ? [shopData.shopImage] : [] as string[],
        shopSlug: shopData.shopSlug || '',
        email: shopData.email || '',
        name: shopData.name || ''
      })
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
      location: '', isGlobal: false, imageUrl: '', imageUrls: [] as string[], published: true,
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
      imageUrls: r.imageUrl ? [r.imageUrl] : [] as string[],
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
        imageUrl: form.imageUrls?.[0] || null,
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
        fetchAll()
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

  const handleDelete = async () => {
    try {
      if (!confirmAction || confirmAction !== 'delete-item') return;
      const res = await fetch(`/api/products/${confirmTitle}`, { method: 'DELETE' })
      if (res.ok) { success('Deleted'); fetchAll() }
      else error('Failed to delete')
    } catch { error('Failed to delete') }
  }

  const handleTogglePublish = async (id: string, current: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !current })
    })
    if (res.ok) { fetchAll(); success(!current ? 'Published!' : 'Hidden') }
    else error('Failed')
  }

  const handleShopSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/shop', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shopForm, shopImage: shopForm.shopImages?.[0] || null })
      })
      if (res.ok) { success('Shop settings saved!'); fetchAll(); setShowShopModal(false) }
      else { const err = await res.json(); error(err.error || 'Failed to save') }
    } catch { error('Failed to save') }
    setSaving(false)
  }

  const handleUnpublishShop = async () => {
    try {
      const res = await fetch('/api/shop?action=unpublish', { method: 'DELETE' })
      if (res.ok) { success('Shop unpublished'); setShowShopModal(false); fetchAll() }
      else error('Failed to unpublish')
    } catch { error('Failed to unpublish') }
  }

  const handleDeleteShop = async () => {
    try {
      const res = await fetch('/api/shop?action=delete', { method: 'DELETE' })
      if (res.ok) { success('Shop deleted'); setShowShopModal(false); fetchAll() }
      else error('Failed to delete shop')
    } catch { error('Failed to delete shop') }
  }

  const filtered = rentals.filter(r => {
    if (filter === 'published' && !r.published) return false
    if (filter === 'draft' && r.published) return false
    if (filter === 'available' && !r.rentalAvailable) return false
    if (filter === 'unavailable' && r.rentalAvailable) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>🏠 My Rentals</h1>
          <p className={styles.welcome}>Manage your rental listings</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/rentals" className="btn-secondary">
            🌐 View Public
          </Link>
          <button onClick={() => setShowShopModal(true)} className="btn-secondary">
            ⚙️ Shop Settings
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
            ➕ Add Rental
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search rentals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
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
        <Skeleton width="100%" height="2rem" />
      ) : filtered.length === 0 && !showForm ? (
        <EmptyState icon="🏠" title="No rental listings yet" description="List items for rent." action={{ label: 'Add Rental', onClick: () => window.location.href = '/dashboard/rentals' }} />
      ) : (
        <div className={styles.list}>
          {filtered.map(r => (
            <div key={r.id} className={styles.item}>
              <div className={styles.itemImage}>
                {r.imageUrl ? <img src={r.imageUrl} alt={r.title} /> : <div className={styles.imagePlaceholder}>🏠</div>}
              </div>
              <div className={styles.itemMain}>
                <div className={styles.itemHeader}>
                  <h3>{r.title}</h3>
                  <span className={`badge ${r.published ? 'badge-published' : 'badge-draft'}`}>
                    {r.published ? '✓ Published' : 'Draft'}
                  </span>
                </div>
                <p className={styles.itemDesc}>{r.description?.slice(0, 80) || 'No description'}</p>
                <div className={styles.itemMeta}>
                  {r.rentalDaily && <span className={styles.priceTag}>${r.rentalDaily}/day</span>}
                  {r.rentalWeekly && <span className={styles.priceTag}>${r.rentalWeekly}/wk</span>}
                  {r.rentalMonthly && <span className={styles.priceTag}>${r.rentalMonthly}/mo</span>}
                  {r.rentalDeposit && <span className={styles.deposit}>Deposit: ${r.rentalDeposit}</span>}
                  <span>{r.isGlobal ? '🌍 Global' : `📍 ${r.location || 'Local'}`}</span>
                  <span>Min {r.rentalMinDays} day{r.rentalMinDays > 1 ? 's' : ''}</span>
                  <span className={r.rentalAvailable ? styles.available : styles.unavailable}>
                    {r.rentalAvailable ? '✓ Available' : '✕ Unavailable'}
                  </span>
                </div>
              </div>
              <div className={styles.itemActions}>
                <Link href={`/products/${r.id}`} className={styles.viewBtn}>👁️ View</Link>
                <button onClick={() => startEdit(r)} className={styles.editBtn}>✏️ Edit</button>
                <button onClick={() => handleTogglePublish(r.id, r.published)} className={r.published ? styles.hideBtn : styles.publishBtn}>
                  {r.published ? '👁️ Hide' : '✅ Publish'}
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
                  <label>Image</label>
                  <ImageUploader images={form.imageUrls || []} onChange={(urls) => setForm({...form, imageUrls: urls})} maxImages={1} />
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

      {showShopModal && (
        <div className="modal-overlay" onClick={() => setShowShopModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>⚙️ Shop Settings</h2>
            <form onSubmit={handleShopSubmit}>
              <div className="form-group">
                <label>Shop Name</label>
                <input type="text" value={shopForm.shopName} onChange={e => setShopForm({...shopForm, shopName: e.target.value})} placeholder="Your shop name" />
              </div>
              <div className="form-group">
                <label>About Your Shop</label>
                <textarea value={shopForm.shopAbout} onChange={e => setShopForm({...shopForm, shopAbout: e.target.value})} rows={3} placeholder="Tell customers about your shop..." />
              </div>
              <div className="form-group">
                <label>Shop Image</label>
                <ImageUploader images={shopForm.shopImages || []} onChange={(urls) => setShopForm({...shopForm, shopImages: urls})} maxImages={1} />
              </div>
              <div className="form-group">
                <label>Shop URL Slug</label>
                <input type="text" value={shopForm.shopSlug} onChange={e => setShopForm({...shopForm, shopSlug: e.target.value})} placeholder="my-shop" />
                <small style={{color: 'var(--text-secondary)'}}>xistrymemz.com/shop/{shopForm.shopSlug || 'your-slug'}</small>
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={shopForm.email} onChange={e => setShopForm({...shopForm, email: e.target.value})} placeholder="you@example.com" />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowShopModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
              </div>
            </form>
            {shopSettings?.shopSlug && (
              <div className={styles.dangerZone}>
                <h3>Danger Zone</h3>
                <p>These actions affect your entire shop.</p>
                <div className={styles.dangerActions}>
                  <button onClick={() => setConfirmAction('unpublish-shop')} className={styles.unpublishBtn}>Unpublish Shop</button>
                  <button onClick={() => setConfirmAction('delete-shop')} className={styles.deleteShopBtn}>Delete Shop</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={confirmAction === 'delete-item'}
        onClose={() => { setConfirmAction(null); setConfirmTitle('') }}
        onConfirm={handleDelete}
        title="Delete Rental"
        message={`Permanently delete this rental? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'unpublish-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleUnpublishShop}
        title="Unpublish Shop"
        message="Your shop will no longer appear in the directory. All products are preserved."
        confirmLabel="Unpublish"
        variant="warning"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'delete-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteShop}
        title="Delete Shop"
        message="This permanently removes your shop name, description, and image. Your products will remain but will no longer be linked to a shop. This cannot be undone."
        confirmLabel="Delete Shop"
        variant="danger"
      />
    </div>
  )
}
