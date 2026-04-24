'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

interface CourierService {
  id: string
  name: string
  description: string | null
  serviceType: string
  basePrice: number
  pricePerMile: number
  maxDistance: number
  availableAreas: string | null
  isActive: boolean
}

export default function CourierSetupPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success, error } = useToast()
  const [services, setServices] = useState<CourierService[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<CourierService | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    serviceType: 'DELIVERY',
    basePrice: '',
    pricePerMile: '0',
    maxDistance: '50',
    availableAreas: '',
    isActive: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user) {
      fetchServices()
    }
  }, [session])

  const fetchServices = async () => {
    try {
      const res = await fetch(`/api/courier?userId=${session?.user?.id}`)
      if (res.ok) {
        const data = await res.json()
        setServices(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const url = editingService ? `/api/courier/${editingService.id}` : '/api/courier'
      const method = editingService ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: parseFloat(formData.basePrice),
          pricePerMile: parseFloat(formData.pricePerMile),
          maxDistance: parseFloat(formData.maxDistance),
          availableAreas: formData.availableAreas || null
        })
      })

      if (res.ok) {
        setShowForm(false)
        setEditingService(null)
        setFormData({
          name: '',
          description: '',
          serviceType: 'DELIVERY',
          basePrice: '',
          pricePerMile: '0',
          maxDistance: '50',
          availableAreas: '',
          isActive: true
        })
        fetchServices()
      } else {
        const err = await res.json()
        error(err.error || 'Failed to save service')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (service: CourierService) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description || '',
      serviceType: service.serviceType,
      basePrice: service.basePrice.toString(),
      pricePerMile: service.pricePerMile.toString(),
      maxDistance: service.maxDistance.toString(),
      availableAreas: service.availableAreas || '',
      isActive: service.isActive
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this courier service?')) return
    try {
      const res = await fetch(`/api/courier/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchServices()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleActive = async (service: CourierService) => {
    try {
      const res = await fetch(`/api/courier/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive })
      })
      if (res.ok) {
        fetchServices()
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (status === 'loading' || loading) {
    return <div className={styles.container}><div className={styles.loading}>Loading...</div></div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>🚚 Courier Services</h1>
          <p className={styles.subtitle}>Offer delivery services to marketplace buyers</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingService(null); setFormData({
          name: '',
          description: '',
          serviceType: 'DELIVERY',
          basePrice: '',
          pricePerMile: '0',
          maxDistance: '50',
          availableAreas: '',
          isActive: true
        })}} className={styles.addBtn}>
          + New Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🚚</div>
          <h2>No courier services yet</h2>
          <p>Start offering delivery services to help buyers receive their purchases</p>
          <button onClick={() => setShowForm(true)} className={styles.createBtn}>
            Create Your First Service
          </button>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {services.map(service => (
            <div key={service.id} className={`${styles.serviceCard} ${!service.isActive ? styles.inactive : ''}`}>
              <div className={styles.serviceHeader}>
                <span className={`badge badge-${service.serviceType.toLowerCase()}`}>
                  {service.serviceType}
                </span>
                <button 
                  onClick={() => handleToggleActive(service)}
                  className={service.isActive ? styles.activeBtn : styles.inactiveBtn}
                >
                  {service.isActive ? 'Active' : 'Paused'}
                </button>
              </div>
              <h3>{service.name}</h3>
              {service.description && <p className={styles.serviceDesc}>{service.description}</p>}
              <div className={styles.servicePricing}>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Base Price</span>
                  <span className={styles.priceValue}>${service.basePrice.toFixed(2)}</span>
                </div>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Per Mile</span>
                  <span className={styles.priceValue}>${service.pricePerMile.toFixed(2)}</span>
                </div>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Max Distance</span>
                  <span className={styles.priceValue}>{service.maxDistance} mi</span>
                </div>
              </div>
              {service.availableAreas && (
                <p className={styles.serviceAreas}>
                  📍 Areas: {service.availableAreas}
                </p>
              )}
              <div className={styles.serviceActions}>
                <button onClick={() => handleEdit(service)} className={styles.editBtn}>
                  Edit
                </button>
                <button onClick={() => handleDelete(service.id)} className={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingService ? 'Edit Courier Service' : 'Create Courier Service'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Standard Delivery, Express Delivery"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your delivery service..."
                  rows={2}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Type</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({...formData, serviceType: e.target.value})}
                  >
                    <option value="DELIVERY">Delivery</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="EXPRESS">Express</option>
                    <option value="INTERNATIONAL">International</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Base Price ($) *</label>
                  <input
                    type="number"
                    value={formData.basePrice}
                    onChange={e => setFormData({...formData, basePrice: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price Per Mile ($)</label>
                  <input
                    type="number"
                    value={formData.pricePerMile}
                    onChange={e => setFormData({...formData, pricePerMile: e.target.value})}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Max Distance (miles)</label>
                  <input
                    type="number"
                    value={formData.maxDistance}
                    onChange={e => setFormData({...formData, maxDistance: e.target.value})}
                    placeholder="50"
                    min="1"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Service Areas (zip codes or cities, comma separated)</label>
                <input
                  type="text"
                  value={formData.availableAreas}
                  onChange={e => setFormData({...formData, availableAreas: e.target.value})}
                  placeholder="e.g., 90210, Beverly Hills, Los Angeles"
                />
              </div>
              <div className="form-group">
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  />
                  Service is active and available
                </label>
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
