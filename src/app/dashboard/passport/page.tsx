'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'
import dynamic from 'next/dynamic'

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

  // Map state
  const [mapReady, setMapReady] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [addSearchLoading, setAddSearchLoading] = useState(false)
  const [addLat, setAddLat] = useState<string>('')
  const [addLng, setAddLng] = useState<string>('')
  const [stampPage, setStampPage] = useState(0)
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
    try { const r = await fetch('/api/users/locations'); if (r.ok) setSavedLocations(await r.json()) } catch {}
    try { const r = await fetch('/api/locations/categories'); if (r.ok) setCategories(await r.json()) } catch {}
    setLoading(false)
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) { toastError('Geolocation not supported'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLatitude(pos.coords.latitude); setLongitude(pos.coords.longitude); setGeoLoading(false) },
      () => { toastError('Failed to get location'); setGeoLoading(false) }
    )
  }

  const handleClearLocation = () => { setLatitude(null); setLongitude(null) }

  const handleTravelToggle = () => {
    const next = !traveling
    setTraveling(next)
    fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ traveling: next })
    }).then(r => {
      if (r.ok) {
        toastSuccess(next ? 'Traveling mode on' : 'Home mode restored')
        window.dispatchEvent(new CustomEvent('traveling-changed', { detail: { traveling: next } }))
      } else toastError('Failed to update traveling status')
    }).catch(() => toastError('Failed to update traveling status'))
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
        const saved = await res.json()
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

  const handleDeleteLocation = async (locId: string) => {
    if (!confirm('Delete this location?')) return
    try {
      const res = await fetch(`/api/users/locations/${locId}`, { method: 'DELETE' })
      if (res.ok) { setSavedLocations(prev => prev.filter(l => l.id !== locId)); toastSuccess('Location deleted') }
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
        const cat = await res.json()
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
        const updated = await res.json()
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

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Delete this category? Locations will be uncategorized.')) return
    try {
      const res = await fetch(`/api/locations/categories/${catId}`, { method: 'DELETE' })
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== catId))
        setSavedLocations(prev => prev.map(l => l.categoryId === catId ? { ...l, category: null, categoryId: null } : l))
        toastSuccess('Category deleted')
      } else { toastError('Failed to delete category') }
    } catch { toastError('Failed to delete category') }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>

  return (
    <>
      <style>{`.leaflet-pane { z-index: 1; } .leaflet-top, .leaflet-bottom { z-index: 2; }`}</style>
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      {/* Earth Passport Section */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px', color: 'var(--accent-success)', fontSize: '1.5rem' }}>🌍 Earth Passport</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Manage your home location, traveling status, and search radius for community discovery.
        </p>

        {/* Preview badge */}
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: traveling ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 217, 255, 0.1)', border: traveling ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(0, 217, 255, 0.2)', color: traveling ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
              {traveling ? '✈️' : '📍'} {location || 'Your City'}{traveling && <span style={{ opacity: 0.6 }}> traveling</span>}
            </span>
            <button onClick={handleTravelToggle} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid var(--accent-success)', borderRadius: '20px', color: 'var(--accent-success)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
              Switch to {traveling ? '📍 Home' : '✈️ Traveling'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Your Location (City, Country)</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country"
              style={{ flex: 1, minWidth: '200px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
            <button onClick={handleGeolocate} disabled={geoLoading}
              style={{ padding: '8px 14px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '8px', cursor: geoLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              {geoLoading ? '...' : '📍 Auto-Detect'}
            </button>
            {latitude && longitude && (
              <button onClick={handleClearLocation}
                style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>Clear</button>
            )}
          </div>
          {latitude && longitude && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lat </span><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{latitude.toFixed(4)}</span></div>
              <div><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lng </span><span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{longitude.toFixed(4)}</span></div>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Neighborhood / Area</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Your local neighborhood or district"
              style={{ flex: 1, padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
            {neighborhood && (
              <button onClick={() => setNeighborhood('')} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid var(--accent-secondary)', color: 'var(--accent-secondary)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Clear</button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Search Radius ({searchRadius}km)</label>
          <input type="range" min="1" max="500" value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-success)' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>Shows listings within this radius when using "Near Me" filters.</p>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: traveling ? 'var(--accent-warning)' : 'var(--text-secondary)' }}>
            <input type="checkbox" checked={traveling} onChange={handleTravelToggle} style={{ width: '18px', height: '18px', accentColor: 'var(--accent-warning)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>I'm currently traveling</span>
          </label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '4px 0 0' }}>
            {traveling ? 'Your profile shows you as traveling. Community members will see you\'re on the move.' : 'Your profile shows your home location. Toggle this on when traveling.'}
          </p>
          {traveling && savedLocations.length > 0 && (
            <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--accent-warning)', fontSize: '0.8rem', fontWeight: 600 }}>✈️ Set Current Location From Saved</label>
              <select onChange={e => {
                const loc = savedLocations.find(l => l.id === e.target.value)
                if (loc) { setLocation(loc.location); setLatitude(loc.latitude); setLongitude(loc.longitude); handleSavePassport() }
              }} style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <option value="">Select a saved location...</option>
                {savedLocations.filter(l => l.latitude && l.longitude).map(l => <option key={l.id} value={l.id}>{l.name} — {l.location}</option>)}
              </select>
            </div>
          )}
        </div>

        <button onClick={handleSavePassport} disabled={saving} style={{ padding: '10px 20px', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          {saving ? 'Saving...' : '💾 Save Passport'}
        </button>
      </div>

      {/* Map */}
      {mapReady && L && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span>📍 Home</span>
              {savedLocations.some(l => l.isPrimary) && <span>⭐ Primary</span>}
              <span>🏕️ Categories</span>
            </div>
            <button onClick={() => setMapExpanded(!mapExpanded)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>
              {mapExpanded ? '🗺️ Collapse' : '🗺️ Expand'}
            </button>
          </div>
          <div style={{ height: mapExpanded ? '550px' : '300px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', border: '1px solid var(--border-color)', transition: 'height 0.2s' }}>
            <MapContainer key={`overview-${latitude}-${longitude}`} center={latitude ? [latitude, longitude!] : savedLocations.find(l => l.latitude && l.longitude) ? [savedLocations.find(l => l.latitude && l.longitude)!.latitude!, savedLocations.find(l => l.latitude && l.longitude)!.longitude!] : [20, 0]}
              zoom={latitude || savedLocations.some(l => l.latitude) ? 5 : 2} style={{ width: '100%', height: '100%' }}>
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
        <div style={{ background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', border: '2px solid var(--border-color)', borderRadius: '16px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            <h2 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '1.2rem' }}>My Passport Book</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>{savedLocations.filter(l => l.lastVisitedAt).length} stamps</span>
          </div>
          {(() => {
            const stamped = savedLocations.filter(l => l.lastVisitedAt)
            if (stamped.length === 0) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>No stamps yet. Use 💮 Stamp on a saved location.</p>
            const totalPages = Math.ceil(stamped.length / stampsPerPage)
            const page = Math.min(stampPage, totalPages - 1)
            const pageItems = [...stamped].reverse().slice(page * stampsPerPage, (page + 1) * stampsPerPage)
            return <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {pageItems.map(loc => (
                  <div key={loc.id} style={{
                    background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px',
                    border: `2px solid ${loc.category?.color || '#3b82f6'}40`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px',
                    position: 'relative'
                  }}>
                    <button onClick={() => handleRemoveStamp(loc.id)}
                      style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', border: 'none', background: 'var(--bg-tertiary)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: `${loc.category?.color || '#3b82f6'}20`,
                      border: `2px solid ${loc.category?.color || '#3b82f6'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem'
                    }}>
                      {loc.category?.icon || '📍'}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{loc.name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(loc.lastVisitedAt!).toLocaleDateString()}
                    </div>
                    {loc.isPrimary && <span style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '6px', fontWeight: 600 }}>Primary</span>}
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <button onClick={() => setStampPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    style={{ padding: '4px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', opacity: page === 0 ? 0.5 : 1 }}>← Prev</button>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '4px 8px' }}>Page {page + 1} of {totalPages}</span>
                  <button onClick={() => setStampPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    style={{ padding: '4px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', opacity: page >= totalPages - 1 ? 0.5 : 1 }}>Next →</button>
                </div>
              )}
            </>
          })()}
        </div>
      )}

      {/* Saved Locations Section */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>📍 Saved Locations</h2>
          <button onClick={() => { setShowLocationForm(true); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }) }}
            style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            + Add Location
          </button>
        </div>

        {savedLocations.length === 0 && !showLocationForm && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem' }}>
            No saved locations yet. Add places you frequent.
          </p>
        )}

        {savedLocations.map(loc => (
          <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px', border: loc.isPrimary ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{loc.name}</span>
                {loc.isPrimary && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--accent-primary)', color: '#fff', borderRadius: '10px', fontWeight: 600 }}>Primary</span>}
                {loc.category && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: `${loc.category.color}20`, color: loc.category.color, borderRadius: '10px', fontWeight: 500, border: `1px solid ${loc.category.color}40` }}>{loc.category.icon} {loc.category.name}</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loc.location}</div>
              {loc.latitude && loc.longitude && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button onClick={() => handleEditLocation(loc)} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-success)', borderRadius: '6px', color: 'var(--accent-success)', cursor: 'pointer', fontSize: '0.75rem' }}>✏️ Edit</button>
                <button onClick={() => { setLocation(loc.location); setLatitude(loc.latitude); setLongitude(loc.longitude); setTraveling(false); handleSavePassport() }} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-warning)', borderRadius: '6px', color: 'var(--accent-warning)', cursor: 'pointer', fontSize: '0.75rem' }}>🏠 Home</button>
                {!loc.isPrimary ? (
                  <button onClick={() => handleSetPrimaryLocation(loc.id)} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>⭐ Primary</button>
                ) : (
                  <button onClick={handleRemovePrimary} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>Unset Primary</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => handleStampLocation(loc.id)} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem' }}>💮 Stamp</button>
                {categories.length > 0 && (
                  <select value={loc.categoryId || ''} onChange={e => {
                    const categoryId = e.target.value || null
                    fetch(`/api/users/locations/${loc.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId }) })
                      .then(r => { if (r.ok) r.json().then(u => setSavedLocations(prev => prev.map(l => l.id === loc.id ? { ...l, categoryId, category: categories.find(c => c.id === categoryId) || null } : l))); else toastError('Failed') }).catch(() => {})
                  }} style={{ fontSize: '0.7rem', padding: '4px 6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                    <option value="">Category</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                  </select>
                )}
                <button onClick={() => handleDeleteLocation(loc.id)} style={{ padding: '4px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}>🗑️ Delete</button>
              </div>
            </div>
          </div>
        ))}

        {showLocationForm && (
          <form onSubmit={handleSaveLocation} style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>{editingLocationId ? 'Edit Location' : 'Add New Location'}</h3>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Location Name</label>
              <input type="text" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g., Home, Office, Favorite Cafe..." required
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Search or drop a pin</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '8px' }}>
                <input type="text" value={addSearch} onChange={e => setAddSearch(e.target.value)}
                  placeholder="e.g., Central Park, New York" onKeyDown={e => e.key === 'Enter' && handleAddSearch()}
                  style={{ flex: 1, padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
                <button type="button" onClick={handleAddSearch} disabled={addSearchLoading}
                  style={{ padding: '10px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                  {addSearchLoading ? '...' : 'Search'}
                </button>
              </div>
              {mapReady && (
                <div style={{ height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                  <MapContainer key={addLat + addLng || 'init'} center={addLat && addLng ? [parseFloat(addLat), parseFloat(addLng)] : [20, 0]} zoom={addLat && addLng ? 14 : 2} style={{ width: '100%', height: '100%' }}>
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

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Address</label>
              <input type="text" value={locationForm.location} onChange={e => setLocationForm({ ...locationForm, location: e.target.value })} placeholder="Auto-filled from search or pin-drop" required
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Category</label>
              <select value={locationForm.categoryId} onChange={e => setLocationForm({ ...locationForm, categoryId: e.target.value })}
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                <option value="">No category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowLocationForm(false); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }); setAddLat(''); setAddLng(''); setAddSearch('') }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
              <button type="submit" disabled={locationSaving}
                style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                {locationSaving ? 'Saving...' : editingLocationId ? 'Save Changes' : 'Save Location'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Location Categories Section */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>🗂️ Location Categories</h2>
          <button onClick={() => { setShowCategoryForm(true); setEditingCategory(null); setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' }) }}
            style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            + Add Category
          </button>
        </div>

        {categories.length === 0 && !showCategoryForm && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem' }}>
            No categories yet. Create categories to group your saved locations.
          </p>
        )}

        {categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '10px', marginBottom: '8px', border: `1px solid ${cat.color}40` }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: '1.2rem' }}>{cat.icon}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{cat.name}</div></div>
            <button onClick={() => handleEditCategory(cat)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-success)', borderRadius: '6px', color: 'var(--accent-success)', cursor: 'pointer', fontSize: '0.8rem' }}>Edit</button>
            <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--accent-secondary)', borderRadius: '6px', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
          </div>
        ))}

        {showCategoryForm && (
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} style={{ marginTop: '16px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--accent-primary)' }}>{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Name</label>
              <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Camping, Restaurants, Shops" required
                style={{ width: '100%', padding: '10px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.875rem' }} />
            </div>

            {/* Icon picker */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Icon</label>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {['📍','🏠','🏢','🏕️','⛺','🏖️','🏔️','🌲','🌊','🏛️','🍽️','☕','🍺','🛒','🏪','⛽','🅿️','🚉','🏥','💊','📚','🎭','🏟️','⛪','🌄','🌋','🏜️','🌵','🌸','🎪','⚽','🎯','🎨','🎵','🛠️','🚜','🐾','🌻'].map(ic => (
                  <button key={ic} type="button" onClick={() => setCategoryForm({ ...categoryForm, icon: ic })}
                    style={{ fontSize: '1.2rem', padding: '4px 6px', cursor: 'pointer', background: categoryForm.icon === ic ? 'var(--accent-primary)' : 'var(--bg-secondary)', border: categoryForm.icon === ic ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)', borderRadius: '6px', lineHeight: 1 }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Color</label>
              <input type="color" value={categoryForm.color} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                style={{ width: '100%', height: '40px', padding: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setEditingCategory(null); setShowCategoryForm(false); setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' }) }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={!categoryForm.name.trim() || categorySaving}
                style={{ padding: '8px 16px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                {categorySaving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Add Category'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
    </>
  )
}
