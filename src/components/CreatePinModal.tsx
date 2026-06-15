'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import ImageUploader from '@/components/ImageUploader'
import AssetPicker from '@/components/AssetPicker'
import { PIN_CATEGORIES } from '@/lib/pin-categories'
import type { UserAsset } from '@/components/AssetPicker'
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/geocoding'
import styles from './CreatePinModal.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const MapClickHandler = dynamic(() => import('@/components/MapClickHandler').then(m => m.default), { ssr: false })

const ASSET_ICONS: Record<string, string> = {
  PRODUCT: '🛒', SERVICE: '🔧', EVENT: '📅', GROUP: '👥',
  PLAN: '🚀', REQUEST: '📝', SCHOOL_CONTENT: '📚', POST: '✏️', SHOP: '🏪', USER: '👤',
}

interface CreatePinModalProps {
  boardSlug: string
  boardName: string
  onClose: () => void
  onCreated: () => void
}

export default function CreatePinModal({ boardSlug, boardName, onClose, onCreated }: CreatePinModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 16)
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null)
  const [pinLat, setPinLat] = useState('')
  const [pinLng, setPinLng] = useState('')
  const [geoSearch, setGeoSearch] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)
  const [settingLocation, setSettingLocation] = useState(false)

  const expiryPresets = useMemo(() => {
    const now = new Date(); const day = 86400000
    return {
      '7d': new Date(now.getTime() + 7 * day).toISOString().slice(0, 16),
      '30d': new Date(now.getTime() + 30 * day).toISOString().slice(0, 16),
      '90d': new Date(now.getTime() + 90 * day).toISOString().slice(0, 16),
    }
  }, [])

  const handleGeoCode = async () => {
    if (!geoSearch.trim()) return
    setGeoLoading(true)
    try {
      const result = await geocodeLocation(geoSearch)
      if (result) {
        setPinLat(String(result.latitude))
        setPinLng(String(result.longitude))
      } else { setError('Could not find that location') }
    } catch { setError('Geocoding failed') }
    finally { setGeoLoading(false) }
  }

  const handleMapClick = async (e: any) => {
    if (!settingLocation) return
    setSettingLocation(false)
    const { lat, lng } = e.latlng
    setPinLat(lat.toFixed(6))
    setPinLng(lng.toFixed(6))
    try {
      const addr = await reverseGeocodeLocation(lat, lng)
      if (addr) { const short = addr.split(',').slice(0, 3).join(','); setContent(c => c || short) }
    } catch {}
  }

  const hasCoords = pinLat && pinLng
  const mapCenter: [number, number] = hasCoords ? [parseFloat(pinLat), parseFloat(pinLng)] : [20, 0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) { setError('Content is required'); return }
    if (!expiresAt) { setError('Expiration date is required'); return }

    setSubmitting(true)
    setError('')

    try {
      const images = imageUrls.length > 0 ? imageUrls : undefined
      const res = await fetch(`/api/boards/${boardSlug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          images, category,
          entityType: selectedAsset?.type || undefined,
          entityId: selectedAsset?.id || undefined,
          entityTitle: selectedAsset?.title || undefined,
          entityImage: selectedAsset?.image || undefined,
          latitude: pinLat ? parseFloat(pinLat) : (selectedAsset?.latitude || undefined),
          longitude: pinLng ? parseFloat(pinLng) : (selectedAsset?.longitude || undefined),
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          expiresAt,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed to create pin') }
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📌 Pin to {boardName}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label}>Category
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
              {PIN_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label className={styles.label}>Title (optional)
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={styles.input} placeholder="Lost Cat - Orange Tabby" />
          </label>

          <label className={styles.label}>Content *
            <textarea value={content} onChange={e => setContent(e.target.value)} className={styles.textarea} placeholder="Describe your pin..." rows={4} required />
          </label>

          <label className={styles.label}>Images (optional)
            <ImageUploader images={imageUrls} onChange={setImageUrls} maxImages={6} />
          </label>

          <AssetPicker selectedAsset={selectedAsset} onSelect={(asset) => { setSelectedAsset(asset); if (asset && !title) setTitle(asset.title) }} />

          <label className={styles.label}>Location
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="text" value={geoSearch} onChange={e => setGeoSearch(e.target.value)} placeholder="Search address..." className={styles.input} style={{ flex: 1, fontSize: '0.82rem' }} onKeyDown={e => e.key === 'Enter' && handleGeoCode()} />
              <button type="button" onClick={handleGeoCode} disabled={geoLoading} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>{geoLoading ? '...' : '🔍 Geocode'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <input type="number" step="any" value={pinLat} onChange={e => setPinLat(e.target.value)} placeholder="Latitude" className={styles.input} style={{ flex: 1, fontSize: '0.82rem' }} />
              <input type="number" step="any" value={pinLng} onChange={e => setPinLng(e.target.value)} placeholder="Longitude" className={styles.input} style={{ flex: 1, fontSize: '0.82rem' }} />
            </div>
            <button type="button" onClick={() => setSettingLocation(s => !s)} style={{ padding: '4px 10px', fontSize: '0.78rem', background: settingLocation ? 'var(--accent-primary)' : 'var(--bg-tertiary)', color: settingLocation ? 'var(--bg-primary)' : 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer' }}>
              {settingLocation ? '✕ Cancel' : '🗺️ Set on Map'}
            </button>
            {settingLocation && (
              <div style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', height: 200, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', pointerEvents: 'none' }}>Click the map to set location</div>
                <MapContainer center={mapCenter} zoom={hasCoords ? 14 : 2} style={{ height: 200, width: '100%' }} scrollWheelZoom={false}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClickHandler onClick={handleMapClick} />
                  {hasCoords && <Marker position={[parseFloat(pinLat), parseFloat(pinLng)]} />}
                </MapContainer>
              </div>
            )}
          </label>

          <label className={styles.label}>Contact Name (optional)
            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} className={styles.input} placeholder="Jane Doe" />
          </label>

          <label className={styles.label}>Contact Email (optional)
            <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className={styles.input} placeholder="jane@example.com" />
          </label>

          <label className={styles.label}>Contact Phone (optional)
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className={styles.input} placeholder="+1 555-0123" />
          </label>

          <label className={styles.label}>Expires At *
            <div className={styles.expiryPresets}>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['7d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['7d'])}>7 days</button>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['30d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['30d'])}>30 days</button>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['90d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['90d'])}>90 days</button>
            </div>
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={styles.input} required />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Pinning...' : '📌 Pin It'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
