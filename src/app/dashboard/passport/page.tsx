'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import dynamic from 'next/dynamic'

import Loading from '@/components/Loading'
import Skeleton from '@/components/Skeleton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/geocoding'
import styles from './passport.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

const MapClickHandlerComponent = dynamic(() => import('@/components/MapClickHandler').then(m => m.default), { ssr: false })

interface UserLocation {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
  categoryId: string | null
  tags: string | null
  notes: string | null
  imageUrl: string | null
  lastVisitedAt: string | null
  createdAt: string
  category: { id: string; name: string; icon: string; color: string } | null
}

type DeleteTarget = { type: 'location'; id: string } | { type: 'category'; id: string } | null

export default function PassportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Earth Passport fields
  const [location, setLocation] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [searchRadius, setSearchRadius] = useState(50)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [traveling, setTraveling] = useState(false)
  const [lookingForCollaborators, setLookingForCollaborators] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoSearchLoading, setGeoSearchLoading] = useState(false)

  // Saved Locations
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([])
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [locationForm, setLocationForm] = useState({ name: '', location: '', latitude: '', longitude: '', categoryId: '' })
  const [locationSaving, setLocationSaving] = useState(false)

  // Categories
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string; color: string }[]>([])
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: '📍', color: '#3b82f6' })
  const [categorySaving, setCategorySaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string; color: string } | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)

  // Save-as-Location form
  const [showSaveAsLocation, setShowSaveAsLocation] = useState(false)
  const [saveAsLocationName, setSaveAsLocationName] = useState('')
  const [saveAsLocationCategoryId, setSaveAsLocationCategoryId] = useState('')
  const [savingAsLocation, setSavingAsLocation] = useState(false)
  const [showQuickCategory, setShowQuickCategory] = useState(false)
  const [quickCategoryName, setQuickCategoryName] = useState('')
  const [quickCategoryIcon, setQuickCategoryIcon] = useState('📍')
  const [quickCategoryColor, setQuickCategoryColor] = useState('#3b82f6')
  const [quickCategorySaving, setQuickCategorySaving] = useState(false)

  // Map state
  const [mapReady, setMapReady] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addSearchLoading, setAddSearchLoading] = useState(false)
  const [addLat, setAddLat] = useState<string>('')
  const [addLng, setAddLng] = useState<string>('')
  const [stampPage, setStampPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const stampsPerPage = 8

  const [L, setL] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet/dist/leaflet.css')
      import('leaflet').then(mod => setL(mod))
      setTimeout(() => setMapReady(true), 200)
    }
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/login')
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) fetchData()
  }, [session])

  const fetchData = async () => {
    try {
      const [userRes] = await Promise.all([fetch('/api/users/me')])
      if (!userRes.ok) throw new Error('Failed to fetch')
      const data = await userRes.json()
      const user = data.user
      setUserData(user)
      setLocation(user.location || '')
      setNeighborhood(user.neighborhood || '')
      setSearchRadius(user.searchRadius || 50)
      setLatitude(user.latitude || null)
      setLongitude(user.longitude || null)
      setTraveling(user.traveling || false)
      setLookingForCollaborators(user.lookingForCollaborators || false)
    } catch (err) {
      console.error('Error fetching passport:', err)
    }
    try { const r = await fetch('/api/users/locations'); if (r.ok) { const d = await r.json(); setSavedLocations(d?.data || d || []) } } catch {}
    try { const r = await fetch('/api/locations/categories'); if (r.ok) { const d = await r.json(); setCategories(d?.data || d || []) } } catch {}
    setLoading(false)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toastError('Geolocation not supported'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        reverseGeocodeLocation(pos.coords.latitude, pos.coords.longitude).then(addr => {
          if (addr) setLocation(addr)
        })
        setGeoLoading(false)
      },
      () => { toastError('Failed to get location'); setGeoLoading(false) }
    )
  }

  const handleGeoCodePassport = async () => {
    if (!location.trim()) return
    setGeoSearchLoading(true)
    try {
      const result = await geocodeLocation(location)
      if (result) {
        setLatitude(result.latitude)
        setLongitude(result.longitude)
      } else { toastError('Could not geocode this location') }
    } catch { toastError('Geocoding failed') }
    finally { setGeoSearchLoading(false) }
  }

  const handleClearLocation = () => { setLatitude(null); setLongitude(null) }

  const handleTravelToggle = () => {
    setTraveling(prev => {
      const next = !prev
      fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ traveling: next })
      }).then(r => {
        if (r.ok) {
          toastSuccess(next ? 'Traveling mode on' : 'Home mode restored')
          window.dispatchEvent(new CustomEvent('traveling-changed', { detail: { traveling: next } }))
        } else {
          toastError('Failed to update traveling status')
          setTraveling(prev) // revert on failure
        }
      }).catch(() => toastError('Failed to update traveling status'))
      return next
    })
  }

  const handleSaveAsLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!saveAsLocationName.trim() || !latitude || !longitude) return
    setSavingAsLocation(true)
    try {
      const res = await fetch('/api/users/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveAsLocationName.trim(),
          location: location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
          latitude,
          longitude,
          categoryId: saveAsLocationCategoryId || null,
        }),
      })
      if (res.ok) {
        const saved = (await res.json())?.data
        setSavedLocations(prev => [...prev, saved])
        toastSuccess('📍 Location saved!')
        setShowSaveAsLocation(false)
        setSaveAsLocationName('')
        setSaveAsLocationCategoryId('')
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to save location')
      }
    } catch { toastError('Failed to save location') }
    finally { setSavingAsLocation(false) }
  }

  const handleSaveQuickCategory = async () => {
    if (!quickCategoryName.trim()) return
    setQuickCategorySaving(true)
    try {
      const res = await fetch('/api/locations/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCategoryName.trim(),
          icon: quickCategoryIcon,
          color: quickCategoryColor,
        }),
      })
      if (res.ok) {
        const cat = (await res.json())?.data
        setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
        setSaveAsLocationCategoryId(cat.id)
        setShowQuickCategory(false)
        setQuickCategoryName('')
        setQuickCategoryIcon('📍')
        setQuickCategoryColor('#3b82f6')
        toastSuccess('Category created')
      } else { toastError('Failed to create category') }
    } catch { toastError('Failed to create category') }
    finally { setQuickCategorySaving(false) }
  }

  const handleSavePassport = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location, neighborhood, searchRadius,
          latitude: latitude ?? null, longitude: longitude ?? null,
          traveling, lookingForCollaborators
        })
      })
      if (res.ok) toastSuccess('Passport updated')
      else toastError('Failed to update passport')
    } catch { toastError('Failed to update passport') }
    finally { setSaving(false) }
  }

  const handleAddSearch = async () => {
    if (!addSearch.trim()) return
    setAddSearchLoading(true)
    try {
      const { geocodeLocation } = await import('@/lib/geocoding')
      const result = await geocodeLocation(addSearch)
      if (result) {
        setAddLat(String(result.latitude))
        setAddLng(String(result.longitude))
        setLocationForm(prev => ({ ...prev, location: result.displayName }))
      } else {
        toastError('No results found')
      }
    } catch {} finally { setAddSearchLoading(false) }
  }

  const handleAddMapClick = (lat: number, lng: number) => {
    setAddLat(String(lat))
    setAddLng(String(lng))
    import('@/lib/geocoding').then(m => m.reverseGeocodeLocation(lat, lng)).then(addr => {
      if (addr) setLocationForm(prev => ({ ...prev, location: addr }))
      else toastError('Could not find address')
    })
  }

  const handleRemoveStamp = async (locId: string) => {
    try {
      const res = await fetch(`/api/users/locations/${locId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastVisitedAt: null })
      })
      if (res.ok) {
        setSavedLocations(prev => prev.map(l => l.id === locId ? { ...l, lastVisitedAt: null } : l))
        toastSuccess('Stamp removed')
      } else toastError('Failed')
    } catch { toastError('Failed') }
  }

  const handleStampLocation = async (locId: string) => {
    try {
      const res = await fetch(`/api/users/locations/${locId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastVisitedAt: new Date().toISOString() })
      })
      if (res.ok) {
        setSavedLocations(prev => prev.map(l => l.id === locId ? { ...l, lastVisitedAt: new Date().toISOString() } : l))
        toastSuccess('📍 Location stamped!')
      }
    } catch {}
  }

  // Location CRUD
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationForm.name.trim() || !locationForm.location.trim()) return
    setLocationSaving(true)
    try {
      const isEdit = !!editingLocationId
      const url = isEdit ? `/api/users/locations/${editingLocationId}` : '/api/users/locations'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationForm.name, location: locationForm.location,
          latitude: addLat ? parseFloat(addLat) : null,
          longitude: addLng ? parseFloat(addLng) : null,
          categoryId: locationForm.categoryId || null
        })
      })
      if (res.ok) {
        const saved = (await res.json())?.data
        if (isEdit) {
          setSavedLocations(prev => prev.map(l => l.id === editingLocationId ? { ...l, ...saved } : l))
          toastSuccess('Location updated')
        } else {
          setSavedLocations(prev => [...prev, saved])
          toastSuccess('Location added')
        }
        setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' })
        setAddLat(''); setAddLng(''); setAddSearch('')
        setEditingLocationId(null)
        setShowLocationForm(false)
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed')
      }
    } catch { toastError('Failed') }
    finally { setLocationSaving(false) }
  }

  const handleEditLocation = (loc: UserLocation) => {
    setEditingLocationId(loc.id)
    setLocationForm({ name: loc.name, location: loc.location, latitude: '', longitude: '', categoryId: loc.categoryId || '' })
    setAddLat(loc.latitude ? String(loc.latitude) : '')
    setAddLng(loc.longitude ? String(loc.longitude) : '')
    setAddSearch('')
    setShowLocationForm(true)
  }

  const handleRemovePrimary = async () => {
    const primary = savedLocations.find(l => l.isPrimary)
    if (!primary) return
    try {
      const res = await fetch(`/api/users/locations/${primary.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: false })
      })
      if (res.ok) {
        setSavedLocations(prev => prev.map(l => ({ ...l, isPrimary: false })))
        toastSuccess('Primary location removed')
      } else { toastError('Failed') }
    } catch { toastError('Failed') }
  }

  const handleSetPrimaryLocation = async (locId: string) => {
    try {
      const res = await fetch(`/api/users/locations/${locId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
      })
      if (res.ok) {
        setSavedLocations(prev => prev.map(l => ({ ...l, isPrimary: l.id === locId })))
        toastSuccess('Primary location updated')
      } else { toastError('Failed to update') }
    } catch { toastError('Failed to update') }
  }

  const handleDeleteLocation = async () => {
    if (!deleteTarget || deleteTarget.type !== 'location') return
    try {
      const res = await fetch(`/api/users/locations/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) { setSavedLocations(prev => prev.filter(l => l.id !== deleteTarget.id)); toastSuccess('Location deleted'); setDeleteTarget(null) }
      else { toastError('Failed to delete') }
    } catch { toastError('Failed to delete') }
  }

  // Category CRUD
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return
    setCategorySaving(true)
    try {
      const res = await fetch('/api/locations/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryForm)
      })
      if (res.ok) {
        const cat = (await res.json())?.data
        setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
        setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' })
        setShowCategoryForm(false)
        toastSuccess('Category added')
      } else { toastError('Failed to add category') }
    } catch { toastError('Failed to add category') }
    finally { setCategorySaving(false) }
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory || !categoryForm.name.trim()) return
    setCategorySaving(true)
    try {
      const res = await fetch(`/api/locations/categories/${editingCategory.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(categoryForm)
      })
      if (res.ok) {
        const updated = (await res.json())?.data
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
        setEditingCategory(null)
        setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' })
        setShowCategoryForm(false)
        toastSuccess('Category updated')
      } else { toastError('Failed to update category') }
    } catch { toastError('Failed to update category') }
    finally { setCategorySaving(false) }
  }

  const handleEditCategory = (cat: { id: string; name: string; icon: string; color: string }) => {
    setEditingCategory(cat)
    setCategoryForm({ name: cat.name, icon: cat.icon, color: cat.color })
    setShowCategoryForm(true)
  }

  const handleDeleteCategory = async () => {
    if (!deleteTarget || deleteTarget.type !== 'category') return
    try {
      const res = await fetch(`/api/locations/categories/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
        setSavedLocations(prev => prev.map(l => l.categoryId === deleteTarget.id ? { ...l, category: null, categoryId: null } : l))
        toastSuccess('Category deleted'); setDeleteTarget(null)
      } else { toastError('Failed to delete category') }
    } catch { toastError('Failed to delete category') }
  }

  if (loading) return <Loading size="medium" />

  return (
    <>
      <style>{`.leaflet-pane { z-index: 1; } .leaflet-top, .leaflet-bottom { z-index: 2; }`}</style>
    <div className={styles.container}>
      {/* Earth Passport Section */}
      <div className={styles.card}>
        <h1 className={styles.passportHeading}>🌍 Earth Passport</h1>
        <p className={styles.description}>
          Manage your home location, traveling status, and search radius for community discovery.
        </p>

        {/* Preview badge */}
        <div className={styles.previewBadge}>
          <div className={`${styles.flex} ${styles.gap8} ${styles.flexWrap} ${styles.flexCenter}`}>
            <span className={styles.badge} style={{ background: traveling ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 217, 255, 0.1)', border: traveling ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(0, 217, 255, 0.2)', color: traveling ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
              {traveling ? '✈️' : '📍'} {location || 'Your City'}              {traveling && <span style={{ opacity: 0.6 }}> traveling</span>}
            </span>
            <button onClick={handleTravelToggle} className={styles.toggleBtn}>
              Switch to {traveling ? '📍 Home' : '✈️ Traveling'}
            </button>
          </div>
        </div>

        <div className={styles.mb12}>
          <label className={styles.label}>Your Location (City, Country)</label>
          <div className={`${styles.flex} ${styles.gap8} ${styles.flexWrap}`}>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country"
              className={styles.input} />
            <button onClick={handleGeolocate} disabled={geoLoading}
              className={styles.geoBtn} style={{ cursor: geoLoading ? 'not-allowed' : 'pointer' }}>
              {geoLoading ? '...' : '📍 Auto-Detect'}
            </button>
            <button onClick={handleGeoCodePassport} disabled={geoSearchLoading}
              className={styles.geoBtn} style={{ cursor: geoSearchLoading ? 'not-allowed' : 'pointer' }}>
              {geoSearchLoading ? '...' : '🔍 Geocode'}
            </button>
            {latitude && longitude && (
              <button onClick={handleClearLocation}
                className={styles.clearBtn}>Clear</button>
            )}
          </div>
          {latitude && longitude && (
            <><div className={styles.coordsBox}>
      <div><span className={styles.coordLabel}>Lat </span><span className={styles.coordValue}>{latitude.toFixed(4)}</span></div>
      <div><span className={styles.coordLabel}>Lng </span><span className={styles.coordValue}>{longitude.toFixed(4)}</span></div>
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <input type="number" step="any" value={latitude ?? ''} onChange={e => setLatitude(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Latitude" className={styles.input} style={{ flex: 1 }} />
      <input type="number" step="any" value={longitude ?? ''} onChange={e => setLongitude(e.target.value ? parseFloat(e.target.value) : null)} placeholder="Longitude" className={styles.input} style={{ flex: 1 }} />
    </div>
    <div style={{ marginTop: 8 }}>
      <button onClick={() => { setSaveAsLocationName(location || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`); setSaveAsLocationCategoryId(''); setShowSaveAsLocation(!showSaveAsLocation) }}
        className={styles.geoBtn}>
        💾 Save as Location
      </button>
    </div>
    {showSaveAsLocation && (
      <div className={styles.locationForm} style={{ marginTop: 8 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Location Name</label>
          <input type="text" value={saveAsLocationName} onChange={e => setSaveAsLocationName(e.target.value)}
            placeholder="e.g., Home, Office, Cafe" className={styles.inputWFull} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Group / Category</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={saveAsLocationCategoryId} onChange={e => setSaveAsLocationCategoryId(e.target.value)}
              className={styles.inputSelect} style={{ flex: 1 }}>
              <option value="">No group</option>
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
            </select>
            <button type="button" onClick={() => setShowQuickCategory(!showQuickCategory)}
              className={styles.addBtn} style={{ whiteSpace: 'nowrap', padding: '8px 12px', fontSize: '0.8rem' }}>
              + New
            </button>
          </div>
          {showQuickCategory && (
            <div className={styles.categoryForm} style={{ marginTop: 8, padding: 12 }}>
              <div className={styles.formGroup} style={{ marginBottom: 8 }}>
                <label className={styles.formLabel}>Name</label>
                <input type="text" value={quickCategoryName} onChange={e => setQuickCategoryName(e.target.value)}
                  placeholder="e.g., Cafe, Park" className={styles.inputWFull} />
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 8 }}>
                <label className={styles.formLabel}>Icon</label>
                <div className={styles.iconGrid}>
                  {['📍','🏠','🏢','🏕️','⛺','🏖️','🏔️','🌲','🌊','🏛️','🍽️','☕','🍺','🛒','🏪','⛽','🅿️','🚉','🏥','💊','📚','🎭','🏟️','⛪','🌄','🌋','🏜️','🌵','🌸','🎪','⚽','🎯','🎨','🎵','🛠️','🚜','🐾','🌻'].map(ic => (
                    <button key={ic} type="button" onClick={() => setQuickCategoryIcon(ic)}
                      className={`${styles.iconBtn} ${quickCategoryIcon === ic ? styles.iconBtnSelected : styles.iconBtnDefault}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.formGroup} style={{ marginBottom: 8 }}>
                <label className={styles.formLabel}>Color</label>
                <input type="color" value={quickCategoryColor} onChange={e => setQuickCategoryColor(e.target.value)}
                  className={styles.colorInput} />
              </div>
              <div className={styles.formActions}>
                <button type="button" onClick={() => setShowQuickCategory(false)}
                  className={styles.cancelBtn}>Cancel</button>
                <button type="button" onClick={handleSaveQuickCategory} disabled={!quickCategoryName.trim() || quickCategorySaving}
                  className={styles.submitBtn}>
                  {quickCategorySaving ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className={styles.formActions}>
          <button type="button" onClick={() => setShowSaveAsLocation(false)}
            className={styles.cancelBtn}>Cancel</button>
          <button type="button" onClick={handleSaveAsLocation} disabled={!saveAsLocationName.trim() || savingAsLocation}
            className={styles.submitBtn}>
            {savingAsLocation ? 'Saving...' : '💾 Save Location'}
          </button>
        </div>
      </div>
    )}</>
          )}
        </div>

        <div className={styles.mb12}>
          <label className={styles.label}>Neighborhood / Area</label>
          <div className={`${styles.flex} ${styles.gap8}`}>
            <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Your local neighborhood or district"
              className={styles.input} />
            {neighborhood && (
              <button onClick={() => setNeighborhood('')} className={styles.neighborhoodClearBtn}>Clear</button>
            )}
          </div>
        </div>

        <div className={styles.mb12}>
          <label className={styles.label}>Search Radius ({searchRadius}km)</label>
          <input type="range" min="1" max="500" value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} className={styles.rangeInput} />
          <p className={styles.rangeDesc}>Shows listings within this radius when using "Near Me" filters.</p>
        </div>

        <div className={styles.mb12}>
          <label className={styles.checkboxLabel} style={{ color: traveling ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>
            <input type="checkbox" checked={traveling} onChange={handleTravelToggle} className={styles.checkbox} />
            <span className={styles.checkboxText}>I'm currently traveling</span>
          </label>
          <p className={styles.rangeDesc}>
            {traveling ? 'Your profile shows you as traveling. Community members will see you\'re on the move.' : 'Your profile shows your home location. Toggle this on when traveling.'}
          </p>
          {traveling && savedLocations.length > 0 && (
            <div className={styles.travelingContainer}>
              <label className={styles.travelingLabel}>✈️ Set Current Location From Saved</label>
              <select onChange={e => {
                const loc = savedLocations.find(l => l.id === e.target.value)
                if (loc) { setLocation(loc.location); setLatitude(loc.latitude); setLongitude(loc.longitude); handleSavePassport() }
              }} className={styles.travelingSelect}>
                <option value="">Select a saved location...</option>
                {savedLocations.filter(l => l.latitude && l.longitude).map(l => <option key={l.id} value={l.id}>{l.name} — {l.location}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleSavePassport} disabled={saving} className={styles.saveBtn}>
          {saving ? 'Saving...' : '💾 Save Passport'}
        </button>
      </div>

      {/* Map */}
      {mapReady && L && (
        <>
          <div className={styles.mapControls}>
            <div className={styles.legend}>
              <span>📍 Home</span>
              {savedLocations.some(l => l.isPrimary) && <span>⭐ Primary</span>}
              <span>🏕️ Categories</span>
            </div>
            <button onClick={() => setMapExpanded(!mapExpanded)} className={styles.expandBtn}>
              {mapExpanded ? '🗺️ Collapse' : '🗺️ Expand'}
            </button>
          </div>
          <div className={styles.mapWrapper} style={{ height: mapExpanded ? '550px' : '300px' }}>
            <MapContainer key={`overview-${latitude}-${longitude}`} center={latitude ? [latitude, longitude!] : savedLocations.find(l => l.latitude && l.longitude) ? [savedLocations.find(l => l.latitude && l.longitude)!.latitude!, savedLocations.find(l => l.latitude && l.longitude)!.longitude!] : [20, 0]}
              zoom={latitude || savedLocations.some(l => l.latitude) ? 5 : 2} className={styles.mapFull}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {latitude && longitude && (
                <Marker position={[latitude, longitude]} icon={L.divIcon({ html: '<div style="width:30px;height:30px;border-radius:50%;background:var(--accent-success);display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">📍</div>', className: '', iconSize: [30, 30] })}>
                  <Popup><strong>📍 Home</strong><br />{location || 'Your location'}</Popup>
                </Marker>
              )}
              {savedLocations.filter(l => l.latitude && l.longitude).map(loc => (
                <Marker key={loc.id} position={[loc.latitude!, loc.longitude!]}
                  icon={L.divIcon({
                    html: `<div style="width:28px;height:28px;border-radius:50%;background:${loc.category?.color || '#3b82f6'};display:flex;align-items:center;justify-content:center;font-size:13px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${loc.isPrimary ? '⭐' : (loc.category?.icon || '📍')}</div>`,
                    className: '', iconSize: [28, 28]
                  })}>
                  <Popup>
                    <strong>{loc.name}</strong><br />{loc.location}
                    {loc.category && <><br /><span style={{ color: loc.category.color }}>{loc.category.icon} {loc.category.name}</span></>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </>
      )}

      {/* Passport Book Section */}
      {savedLocations.length > 0 && (
        <div className={styles.passportBook}>
          <div className={styles.passportBookHeader}>
            <span className={styles.bookIcon}>📖</span>
            <h2 className={styles.bookTitle}>My Passport Book</h2>
            <span className={styles.stampCount}>{savedLocations.filter(l => l.lastVisitedAt).length} stamps</span>
          </div>
          {(() => {
            const stamped = savedLocations.filter(l => l.lastVisitedAt)
            if (stamped.length === 0) return <p className={styles.emptyStamps}>No stamps yet. Use 💮 Stamp on a saved location.</p>
            const totalPages = Math.ceil(stamped.length / stampsPerPage)
            const page = Math.min(stampPage, totalPages - 1)
            const pageItems = [...stamped].reverse().slice(page * stampsPerPage, (page + 1) * stampsPerPage)
            return <>
              <div className={styles.gridAuto}>
                {pageItems.map(loc => (
                  <div key={loc.id} className={styles.stampCard} style={{
                    border: `2px solid ${loc.category?.color || '#3b82f6'}40`,
                  }}>
                    <button onClick={() => handleRemoveStamp(loc.id)}
                      className={styles.removeStamp}>✕</button>
                    <div className={styles.stampIconCircle} style={{
                      background: `${loc.category?.color || '#3b82f6'}20`,
                      border: `2px solid ${loc.category?.color || '#3b82f6'}`,
                    }}>
                      {loc.category?.icon || '📍'}
                    </div>
                    <div className={styles.stampName}>{loc.name}</div>
                    <div className={styles.stampDate}>
                      {new Date(loc.lastVisitedAt!).toLocaleDateString()}
                    </div>
                    {loc.isPrimary && <span className={styles.primaryTag}>Primary</span>}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button onClick={() => setStampPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className={styles.pageBtn} style={{ opacity: page === 0 ? 0.5 : 1 }}>← Prev</button>
                  <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setStampPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className={styles.pageBtn} style={{ opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Next →</button>
                </div>
              )}
            </>
          })()}
        </div>
      )}

      {/* Saved Locations Section */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>📍 Saved Locations</h2>
          <button onClick={() => { setShowLocationForm(true); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }) }}
            className={styles.addBtn}>
            + Add Location
          </button>
        </div>

        {savedLocations.length === 0 && !showLocationForm && (
          <p className={styles.emptyState}>
            No saved locations yet. Add places you frequent.
          </p>
        )}

        {savedLocations.map(loc => (
          <div key={loc.id} className={styles.locationItem} style={{ border: loc.isPrimary ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
            <div className={styles.locationInfo}>
              <div className={styles.locationNameRow}>
                <span className={styles.locationName}>{loc.name}</span>
                {loc.isPrimary && <span className={styles.primaryLocTag}>Primary</span>}
                {loc.category && <span className={styles.catTag} style={{ background: `${loc.category.color}20`, color: loc.category.color, border: `1px solid ${loc.category.color}40` }}>{loc.category.icon} {loc.category.name}</span>}
              </div>
              <div className={styles.locationMeta}>{loc.location}</div>
              {loc.latitude && loc.longitude && (
                <div className={styles.locationCoords}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
              )}
            </div>
            <div className={styles.locationActions}>
              <div className={styles.locationActionsRow}>
                <button onClick={() => handleEditLocation(loc)} className={`${styles.actionBtn} ${styles.actionBtnSuccess}`}>✏️ Edit</button>
                <button onClick={() => { setLocation(loc.location); setLatitude(loc.latitude); setLongitude(loc.longitude); setTraveling(false); handleSavePassport() }} className={`${styles.actionBtn} ${styles.actionBtnWarning}`}>🏠 Home</button>
                {!loc.isPrimary ? (
                  <button onClick={() => handleSetPrimaryLocation(loc.id)} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>⭐ Primary</button>
                ) : (
                  <button onClick={handleRemovePrimary} className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}>Unset Primary</button>
                )}
              </div>
              <div className={styles.locationActionsRow}>
                <button onClick={() => handleStampLocation(loc.id)} className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>💮 Stamp</button>
                {categories.length > 0 && (
                  <select value={loc.categoryId || ''} onChange={e => {
                    const categoryId = e.target.value || null
                    fetch(`/api/users/locations/${loc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId }) })
                      .then(r => { if (r.ok) r.json().then(u => setSavedLocations(prev => prev.map(l => l.id === loc.id ? { ...l, categoryId, category: categories.find(c => c.id === categoryId) || null } : l))); else toastError('Failed') }).catch(() => {})
                  }} className={styles.catSelect}>
                    <option value="">Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                )}
                <button onClick={() => setDeleteTarget({ type: 'location', id: loc.id })} className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        ))}

        {showLocationForm && (
          <form onSubmit={handleSaveLocation} className={styles.locationForm}>
            <h3 className={styles.formTitle}>{editingLocationId ? 'Edit Location' : 'Add New Location'}</h3>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Location Name</label>
              <input type="text" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g., Home, Office, Favorite Cafe..." required
                className={styles.inputWFull} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Search or drop a pin</label>
              <div className={styles.searchRow}>
                <input type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  placeholder="e.g., Central Park, New York" onKeyDown={e => e.key === 'Enter' && handleAddSearch()}
                  className={styles.inputWFull} />
                <button type="button" onClick={handleAddSearch} disabled={addSearchLoading}
                  className={styles.searchBtn}>
                  {addSearchLoading ? '...' : 'Search'}
                </button>
              </div>
              {mapReady && (
                <div className={styles.miniMap}>
                  <MapContainer key={addLat + addLng || 'init'} center={addLat && addLng ? [parseFloat(addLat), parseFloat(addLng)] : [20, 0]} zoom={addLat && addLng ? 14 : 2} className={styles.mapFull}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandlerComponent onClick={handleAddMapClick} />
                    {addLat && addLng && (
                      <Marker position={[parseFloat(addLat), parseFloat(addLng)]}>
                        <Popup>{locationForm.location || locationForm.name}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Address</label>
              <input type="text" value={locationForm.location} onChange={e => setLocationForm({ ...locationForm, location: e.target.value })} placeholder="Auto-filled from search or pin-drop" required
                className={styles.inputWFull} />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Coordinates</label>
              <div className={styles.searchRow}>
                <input type="text" value={addLat} onChange={e => setAddLat(e.target.value)} placeholder="Latitude" className={styles.inputWFull} />
                <input type="text" value={addLng} onChange={e => setAddLng(e.target.value)} placeholder="Longitude" className={styles.inputWFull} />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {addLat && addLng ? `📍 ${parseFloat(addLat).toFixed(4)}, ${parseFloat(addLng).toFixed(4)}` : 'Auto-filled from search or pin-drop. Edit manually if needed.'}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Category</label>
              <select value={locationForm.categoryId} onChange={e => setLocationForm({ ...locationForm, categoryId: e.target.value })}
                className={styles.inputSelect}>
                <option value="">No category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => { setShowLocationForm(false); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }); setAddLat(''); setAddLng(''); setAddSearch('') }}
                className={styles.cancelBtn}>Cancel</button>
              <button type="submit" disabled={locationSaving}
                className={styles.submitBtn}>
                {locationSaving ? 'Saving...' : editingLocationId ? 'Save Changes' : 'Save Location'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Location Categories Section */}
      <div className={styles.card}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>🗂️ Location Categories</h2>
          <button onClick={() => { setShowCategoryForm(true); setEditingCategory(null); setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' }) }}
            className={styles.addBtn}>
            + Add Category
          </button>
        </div>

        {categories.length === 0 && !showCategoryForm && (
          <p className={styles.emptyState}>
            No categories yet. Create categories to group your saved locations.
          </p>
        )}

        {categories.map(cat => (
          <div key={cat.id} className={styles.categoryItem} style={{ border: `1px solid ${cat.color}40` }}>
            <span className={styles.colorDot} style={{ background: cat.color }} />
            <span className={styles.categoryIcon}>{cat.icon}</span>
            <div className={styles.flex1}><div className={styles.categoryName}>{cat.name}</div></div>
            <button onClick={() => handleEditCategory(cat)} className={styles.editBtn}>Edit</button>
            <button onClick={() => setDeleteTarget({ type: 'category', id: cat.id })} className={styles.deleteBtn}>Delete</button>
          </div>
        ))}

        {showCategoryForm && (
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className={styles.categoryForm}>
            <h3 className={styles.formTitle}>{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Name</label>
              <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Camping, Restaurants, Shops" required
                className={styles.inputWFull} />
            </div>

            {/* Icon picker */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Icon</label>
              <div className={styles.iconGrid}>
                {['📍','🏠','🏢','🏕️','⛺','🏖️','🏔️','🌲','🌊','🏛️','🍽️','☕','🍺','🛒','🏪','⛽','🅿️','🚉','🏥','💊','📚','🎭','🏟️','⛪','🌄','🌋','🏜️','🌵','🌸','🎪','⚽','🎯','🎨','🎵','🛠️','🚜','🐾','🌻'].map(ic => (
                  <button key={ic} type="button" onClick={() => setCategoryForm({ ...categoryForm, icon: ic })}
                    className={`${styles.iconBtn} ${categoryForm.icon === ic ? styles.iconBtnSelected : styles.iconBtnDefault}`}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Color</label>
              <input type="color" value={categoryForm.color} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                className={styles.colorInput} />
            </div>

            <div className={styles.formActions}>
              <button type="button" onClick={() => { setEditingCategory(null); setShowCategoryForm(false); setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' }) }}
                className={styles.cancelBtn}>Cancel</button>
              <button type="submit" disabled={!categoryForm.name.trim() || categorySaving}
                className={styles.submitBtn}>
                {categorySaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteTarget?.type === 'location'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteLocation}
        title="Delete Location"
        message="Remove this location from your passport?"
        confirmLabel="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={deleteTarget?.type === 'category'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message="Locations in this category will become uncategorized."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
    </>
  )
}
