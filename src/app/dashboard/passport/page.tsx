'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

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

  // Location CRUD
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!locationForm.name.trim() || !locationForm.location.trim()) return
    setLocationSaving(true)
    try {
      const res = await fetch('/api/users/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: locationForm.name, location: locationForm.location,
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          categoryId: locationForm.categoryId || null
        })
      })
      if (res.ok) {
        const newLoc = await res.json()
        setSavedLocations(prev => [...prev, newLoc])
        setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' })
        setShowLocationForm(false)
        toastSuccess('Location added')
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to add location')
      }
    } catch { toastError('Failed to add location') }
    finally { setLocationSaving(false) }
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
      {/* Earth Passport Section */}
      <div style={{ background: 'linear-gradient(135deg, #0d1a0d 0%, #0d0d0d 100%)', border: '1px solid #2a4a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 4px', color: '#7fff7f', fontSize: '1.5rem' }}>🌍 Earth Passport</h1>
        <p style={{ color: '#6a8a6a', fontSize: '0.85rem', marginBottom: '20px' }}>
          Manage your home location, traveling status, and search radius for community discovery.
        </p>

        {/* Preview badge */}
        <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, background: traveling ? 'rgba(255, 193, 7, 0.15)' : 'rgba(0, 217, 255, 0.1)', border: traveling ? '1px solid rgba(255, 193, 7, 0.3)' : '1px solid rgba(0, 217, 255, 0.2)', color: traveling ? '#ffc107' : '#00d9ff' }}>
              {traveling ? '✈️' : '📍'} {location || 'Your City'}{traveling && <span style={{ opacity: 0.6 }}> traveling</span>}
            </span>
            <button onClick={() => setTraveling(!traveling)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #4ade80', borderRadius: '20px', color: '#4ade80', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
              Switch to {traveling ? '📍 Home' : '✈️ Traveling'}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#88aa88' }}>Your Location (City, Country)</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a4a2a', borderRadius: '8px', color: '#c0e0c0' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#88aa88' }}>Neighborhood / Area</label>
          <input type="text" value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Your local neighborhood or district" style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a4a2a', borderRadius: '8px', color: '#c0e0c0' }} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#88aa88' }}>Search Radius ({searchRadius}km)</label>
          <input type="range" min="1" max="500" value={searchRadius} onChange={e => setSearchRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#4ade80' }} />
          <p style={{ color: '#6a8a6a', fontSize: '0.75rem', margin: '4px 0 0' }}>Shows listings within this radius when using "Near Me" filters.</p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: traveling ? '#ffc107' : '#88aa88' }}>
            <input type="checkbox" checked={traveling} onChange={e => setTraveling(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ffc107' }} />
            <span><strong>I'm currently traveling</strong></span>
          </label>
          <p style={{ color: '#6a8a6a', fontSize: '0.75rem', margin: '4px 0 0' }}>
            {traveling ? 'Your profile shows you as traveling. Community members will see you\'re on the move.' : 'Your profile shows your home location. Toggle this on when traveling.'}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#88aa88' }}>GPS Coordinates</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={handleGeolocate} disabled={geoLoading} style={{ padding: '8px 16px', background: '#4ade80', color: '#0d1a0d', border: 'none', borderRadius: '8px', cursor: geoLoading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              {geoLoading ? 'Locating...' : '📍 Auto-Detect'}
            </button>
            {latitude && longitude && (
              <button onClick={handleClearLocation} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #ff6b6b', color: '#ff6b6b', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>Clear</button>
            )}
          </div>
          {latitude && longitude && (
            <div style={{ display: 'flex', gap: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}><span style={{ fontSize: '0.7rem', color: '#6a8a6a' }}>Latitude</span><div style={{ fontFamily: 'monospace', color: '#88bb88', fontSize: '0.875rem' }}>{latitude.toFixed(6)}</div></div>
              <div style={{ flex: 1 }}><span style={{ fontSize: '0.7rem', color: '#6a8a6a' }}>Longitude</span><div style={{ fontFamily: 'monospace', color: '#88bb88', fontSize: '0.875rem' }}>{longitude.toFixed(6)}</div></div>
            </div>
          )}
          {!latitude && !longitude && (
            <p style={{ color: '#6a8a6a', fontSize: '0.8rem', margin: 0, padding: '8px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
              No coordinates set. Use auto-detect above, or they will be derived from your location on save.
            </p>
          )}
        </div>

        <button onClick={handleSavePassport} disabled={saving} style={{ padding: '10px 20px', background: '#4ade80', color: '#0d1a0d', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
          {saving ? 'Saving...' : 'Save Passport'}
        </button>
      </div>

      {/* Saved Locations Section */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d1a 100%)', border: '1px solid #2a2a4a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#7f7fff' }}>📍 Saved Locations</h2>
          <button onClick={() => { setShowLocationForm(true); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }) }}
            style={{ padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            + Add Location
          </button>
        </div>

        {savedLocations.length === 0 && !showLocationForm && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem' }}>
            No saved locations yet. Add places you frequent.
          </p>
        )}

        {savedLocations.map(loc => (
          <div key={loc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '8px', border: loc.isPrimary ? '1px solid #7f7fff' : '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#c0c0ff' }}>{loc.name}</span>
                {loc.isPrimary && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#7f7fff', color: '#fff', borderRadius: '10px', fontWeight: 600 }}>Primary</span>}
                {loc.category && <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(127,127,255,0.15)', color: '#c0c0ff', borderRadius: '10px', fontWeight: 500 }}>{loc.category.icon} {loc.category.name}</span>}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{loc.location}</div>
              {loc.latitude && loc.longitude && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px' }}>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!loc.isPrimary && <button onClick={() => handleSetPrimaryLocation(loc.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #7f7fff', borderRadius: '6px', color: '#7f7fff', cursor: 'pointer', fontSize: '0.8rem' }}>Set Primary</button>}
              <button onClick={() => handleDeleteLocation(loc.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ff6b6b', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
            </div>
          </div>
        ))}

        {showLocationForm && (
          <form onSubmit={handleAddLocation} style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#c0c0ff' }}>Add New Location</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Location Name</label>
              <input type="text" value={locationForm.name} onChange={e => setLocationForm({ ...locationForm, name: e.target.value })} placeholder="e.g., Home, Office, Favorite Cafe..." required
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Address / Description</label>
              <input type="text" value={locationForm.location} onChange={e => setLocationForm({ ...locationForm, location: e.target.value })} placeholder="e.g., 123 Main St, City, Country" required
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Category</label>
              <select value={locationForm.categoryId} onChange={e => setLocationForm({ ...locationForm, categoryId: e.target.value })}
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }}>
                <option value="">No category</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Latitude</label>
                <input type="number" step="any" value={locationForm.latitude} onChange={e => setLocationForm({ ...locationForm, latitude: e.target.value })} placeholder="51.5074"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Longitude</label>
                <input type="number" step="any" value={locationForm.longitude} onChange={e => setLocationForm({ ...locationForm, longitude: e.target.value })} placeholder="-0.1278"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowLocationForm(false); setLocationForm({ name: '', location: '', latitude: '', longitude: '', categoryId: '' }) }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
              <button type="submit" disabled={locationSaving}
                style={{ padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                {locationSaving ? 'Saving...' : 'Save Location'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Location Categories Section */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a2a 0%, #0d0d1a 100%)', border: '1px solid #2a2a4a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#7f7fff' }}>🗂️ Location Categories</h2>
          <button onClick={() => setShowCategoryForm(!showCategoryForm)}
            style={{ padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}>
            + Add Category
          </button>
        </div>

        {categories.length === 0 && !showCategoryForm && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px', fontSize: '0.875rem' }}>
            No categories yet. Create categories to group your saved locations.
          </p>
        )}

        {categories.map(cat => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#c0c0ff' }}>{cat.name}</div></div>
            <button onClick={() => handleDeleteCategory(cat.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ff6b6b', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>Delete</button>
          </div>
        ))}

        {showCategoryForm && (
          <form onSubmit={handleAddCategory} style={{ marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#c0c0ff' }}>New Category</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Name</label>
              <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="e.g., Camping, Restaurants, Shops" required
                style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Icon (emoji)</label>
                <input type="text" value={categoryForm.icon} onChange={e => setCategoryForm({ ...categoryForm, icon: e.target.value })} placeholder="📍"
                  style={{ width: '100%', padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', color: '#c0c0ff', fontSize: '0.875rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#8888aa', fontSize: '0.875rem' }}>Color</label>
                <input type="color" value={categoryForm.color} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  style={{ width: '100%', height: '40px', padding: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid #2a2a4a', borderRadius: '8px', cursor: 'pointer' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowCategoryForm(false); setCategoryForm({ name: '', icon: '📍', color: '#3b82f6' }) }}
                style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={!categoryForm.name.trim() || categorySaving}
                style={{ padding: '8px 16px', background: '#7f7fff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                {categorySaving ? 'Saving...' : 'Add Category'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
