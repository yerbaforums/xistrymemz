'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import type { DonationAddr } from '@/types/product'
import ImageUploader from '@/components/ImageUploader'
import Skeleton from '@/components/Skeleton'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import LocationPicker from '@/components/LocationPicker'
import HashtagInput from '@/components/HashtagInput'
import styles from './page.module.css'

interface ShopSettings {
  shopName: string | null
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string | null
  email: string | null
  name: string | null
}

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
  latitude: null as number | null,
  longitude: null as number | null,
  meetingLink: '',
  imageUrl: '',
  imageUrls: [] as string[],
  isActive: true,
  acceptsDonations: false,
  selectedDonationAddrs: [] as DonationAddr[],
  acceptsAppointments: false,
  appointmentDuration: '',
  appointmentLeadTime: '',
  appointmentLocation: '',
  appointmentMeetingLink: '',
  hashtags: [] as string[],
}

export default function DashboardServices() {
  const { success, error: toastError } = useToast()
  const router = useRouter()
  const userDonationAddrs = useDonationAddresses()

  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [search, setSearch] = useState('')
  const [confirmAction, setConfirmAction] = useState<'delete-service' | 'unpublish-shop' | 'delete-shop' | null>(null)
  const [confirmService, setConfirmService] = useState<ServiceOffering | null>(null)
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null)
  const [showShopModal, setShowShopModal] = useState(false)
  const [shopForm, setShopForm] = useState({
    shopName: '', shopAbout: '', shopImage: '', shopImages: [] as string[],
    shopSlug: '', email: '', name: ''
  })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [servicesRes, shopRes] = await Promise.all([
        fetch('/api/services/user'),
        fetch('/api/shop')
      ])
      const servicesData = await servicesRes.json()
      const shopData = await shopRes.json()
      setServices(servicesData?.data?.services || servicesData?.services || [])
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
      latitude: (s as any).latitude || null,
      longitude: (s as any).longitude || null,

      meetingLink: s.meetingLink || '',
      imageUrl: s.imageUrl || '',
      imageUrls: s.imageUrl ? [s.imageUrl] : [],
      isActive: s.isActive,
      acceptsDonations: (s as any).acceptsDonations || false,
      selectedDonationAddrs: hydrateDonationAddresses(
        (s as any).donationAddress,
        (s as any).donationCurrency,
        (s as any).donationAddresses
      ),
      acceptsAppointments: (s as any).acceptsAppointments || false,
      appointmentDuration: (s as any).appointmentDuration?.toString() || '',
      appointmentLeadTime: (s as any).appointmentLeadTime?.toString() || '',
      appointmentLocation: (s as any).appointmentLocation || '',
      appointmentMeetingLink: (s as any).appointmentMeetingLink || '',
      hashtags: (s as any).hashtags?.map((h: any) => h.hashtag?.tag).filter(Boolean) || [],
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
        title: form.title.trim(),
        description: form.description || null,
        category: form.category,
        duration: form.duration,
        price: form.price ? parseFloat(form.price) : null,
        location: form.location || null,
        latitude: form.latitude,
        longitude: form.longitude,
        meetingLink: form.meetingLink || null,
        imageUrl: form.imageUrls?.[0] || null,
        isActive: form.isActive,
        acceptsDonations: form.acceptsDonations,
        selectedDonationAddrs: form.selectedDonationAddrs,
        acceptsAppointments: form.acceptsAppointments,
        appointmentDuration: form.acceptsAppointments && form.appointmentDuration ? parseInt(form.appointmentDuration) : null,
        appointmentLeadTime: form.acceptsAppointments && form.appointmentLeadTime ? parseInt(form.appointmentLeadTime) : null,
        appointmentLocation: form.acceptsAppointments ? (form.appointmentLocation || null) : null,
        appointmentMeetingLink: form.acceptsAppointments ? (form.appointmentMeetingLink || null) : null,
        hashtags: form.hashtags,
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
        fetchAll()
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
        fetchAll()
      }
    } catch {
      toastError('Failed to update')
    }
  }

  const handleDeleteConfirm = async () => {
    if (confirmAction === 'delete-service' && confirmService) {
      try {
        const res = await fetch(`/api/services/${confirmService.id}`, { method: 'DELETE' })
        if (res.ok) { success('Service deleted'); fetchAll() }
        else toastError('Failed to delete')
      } catch { toastError('Failed to delete') }
    } else if (confirmAction === 'unpublish-shop') {
      try {
        const res = await fetch('/api/shop?action=unpublish', { method: 'DELETE' })
        if (res.ok) { success('Shop unpublished'); setShowShopModal(false); fetchAll() }
        else toastError('Failed to unpublish')
      } catch { toastError('Failed to unpublish') }
    } else if (confirmAction === 'delete-shop') {
      try {
        const res = await fetch('/api/shop?action=delete', { method: 'DELETE' })
        if (res.ok) { success('Shop deleted'); setShowShopModal(false); fetchAll() }
        else toastError('Failed to delete shop')
      } catch { toastError('Failed to delete shop') }
    }
    setConfirmAction(null)
    setConfirmService(null)
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
      if (res.ok) {
        success('Shop settings saved!')
        fetchAll()
        setShowShopModal(false)
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to save')
      }
    } catch { toastError('Failed to save') }
    setSaving(false)
  }



  const filteredServices = services.filter(s => {
    if (filter === 'active') return s.isActive
    if (filter === 'inactive') return !s.isActive
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Services</h1>
          <p className={styles.welcome}>Manage your bookable services</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/services" className="btn-secondary">
            🌐 View Public
          </Link>
          <button onClick={() => setShowShopModal(true)} className="btn-secondary">
            ⚙️ Shop Settings
          </button>
          <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
            ➕ Add Service
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search services..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className={styles.count}>{filteredServices.length} items</span>
      </div>

      {loading ? (
        <Skeleton width="100%" height="2rem" />
      ) : filteredServices.length === 0 && !showForm ? (
        <EmptyState icon="🔧" title="No services yet" description="Offer your skills and expertise." action={{ label: 'Add Service', onClick: () => router.push('/dashboard/services') }} />
      ) : (
        <div className={styles.list}>
          {filteredServices.map(s => {
            const cat = s.category as ServiceCategory
            return (
              <div key={s.id} className={styles.item}>
                <div className={styles.itemImage}>
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt={s.title} />
                  ) : (
                    <div className={styles.imagePlaceholder}>{SERVICE_CATEGORY_ICONS[cat] || '📋'}</div>
                  )}
                </div>
                <div className={styles.itemMain}>
                  <div className={styles.itemHeader}>
                    <h3>{s.title}</h3>
                    <span className={`badge ${s.isActive ? 'badge-published' : 'badge-draft'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className={styles.itemDesc}>{s.description?.slice(0, 80) || 'No description'}</p>
                  <div className={styles.itemMeta}>
                    <span className={`badge badge-category`}>{SERVICE_CATEGORY_ICONS[cat]} {SERVICE_CATEGORY_LABELS[cat]}</span>
                    <span>🕐 {formatDuration(s.duration)}</span>
                    {s.price != null && <span className={styles.priceTag}>💰 ${s.price}</span>}
                    {s.location && <span>📍 {s.location}</span>}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => startEdit(s)} className={styles.editBtn}>✏️ Edit</button>
                  <button onClick={() => handleToggleActive(s)} className={s.isActive ? styles.hideBtn : styles.publishBtn}>
                    {s.isActive ? '🕶️ Hide' : '✅ Publish'}
                  </button>
                  <button onClick={() => { setConfirmService(s); setConfirmAction('delete-service') }} className={styles.deleteBtn}>🗑️</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? '✏️ Edit Service' : '➕ Add Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. 1-Hour Guitar Lesson" required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value as ServiceCategory})}>
                    {SERVICE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{SERVICE_CATEGORY_ICONS[cat]} {SERVICE_CATEGORY_LABELS[cat]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duration (minutes) *</label>
                  <input type="number" value={form.duration} onChange={e => setForm({...form, duration: parseInt(e.target.value) || 60})} min={5} step={5} />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" step="0.01" />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Describe what you offer..." />
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <LocationPicker
                    value={{ text: form.location, latitude: form.latitude, longitude: form.longitude }}
                    onChange={v => setForm({...form, location: v.text, latitude: v.latitude, longitude: v.longitude })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Meeting Link</label>
                  <input type="url" value={form.meetingLink} onChange={e => setForm({...form, meetingLink: e.target.value})} placeholder="https://meet.google.com/..." />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Image</label>
                  <ImageUploader images={form.imageUrls || []} onChange={(urls) => setForm({...form, imageUrls: urls})} maxImages={1} />
                </div>
              </div>

              <div className={styles.checkGroup}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                  Active (visible in search)
                </label>
              </div>

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.acceptsDonations} onChange={e => setForm({...form, acceptsDonations: e.target.checked})} />
                Accept Donations
              </label>
              {form.acceptsDonations && (
                <DonationAddressPicker
                  savedAddresses={userDonationAddrs}
                  selectedAddresses={form.selectedDonationAddrs}
                  onAddressesChange={(addrs) => setForm({...form, selectedDonationAddrs: addrs})}
                />
              )}

              <label className={styles.checkLabel}>
                <input type="checkbox" checked={form.acceptsAppointments} onChange={e => setForm({...form, acceptsAppointments: e.target.checked})} />
                Accept Appointments
              </label>
              {form.acceptsAppointments && (
                <div className={styles.appointmentFields}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Default Session Duration (min)</label>
                      <input type="number" value={form.appointmentDuration} onChange={e => setForm({...form, appointmentDuration: e.target.value})} placeholder={form.duration.toString()} min={5} step={5} />
                      <small style={{color: 'var(--text-secondary)'}}>Leave blank to use service duration ({form.duration} min)</small>
                    </div>
                    <div className="form-group">
                      <label>Minimum Lead Time (hours)</label>
                      <input type="number" value={form.appointmentLeadTime} onChange={e => setForm({...form, appointmentLeadTime: e.target.value})} placeholder="24" min={0} />
                      <small style={{color: 'var(--text-secondary)'}}>How far in advance must bookings be made</small>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Appointment Location Override</label>
                      <input type="text" value={form.appointmentLocation} onChange={e => setForm({...form, appointmentLocation: e.target.value})} placeholder="Leave blank to use service location" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Appointment Meeting Link Override</label>
                      <input type="url" value={form.appointmentMeetingLink} onChange={e => setForm({...form, appointmentMeetingLink: e.target.value})} placeholder="Leave blank to use service meeting link" />
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Hashtags</label>
                <HashtagInput value={form.hashtags} onChange={(tags) => setForm({...form, hashtags: tags})} placeholder="Add hashtags..." />
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={resetForm} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Service'}
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
                <small style={{color: 'var(--text-secondary)'}}>xistrymemz.xyz/shop/{shopForm.shopSlug || 'your-slug'}</small>
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
        isOpen={confirmAction === 'delete-service'}
        onClose={() => { setConfirmAction(null); setConfirmService(null) }}
        onConfirm={handleDeleteConfirm}
        title="Delete Service"
        message={`Permanently delete "${confirmService?.title || ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'unpublish-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteConfirm}
        title="Unpublish Shop"
        message="Your shop will no longer appear in the directory."
        confirmLabel="Unpublish"
        variant="warning"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'delete-shop'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Shop"
        message="This permanently removes your shop name, description, and image. Your services will remain but will no longer be linked to a shop. This cannot be undone."
        confirmLabel="Delete Shop"
        variant="danger"
      />
    </div>
  )
}
