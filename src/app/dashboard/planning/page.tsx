'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './planning.module.css'
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/geocoding'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })

let L: any
if (typeof window !== 'undefined') {
  import('leaflet').then(mod => {
    L = mod
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  })
}

interface LocationCategory {
  id: string; name: string; icon: string; color: string
}

interface UserLocation {
  id: string; name: string; location: string; latitude: number | null; longitude: number | null
  categoryId: string | null; tags: string | null; notes: string | null; imageUrl: string | null
  category: LocationCategory | null
}

interface ShoppingItem {
  name: string; quantity: string; checked: boolean
}

interface StopLink {
  url: string; label: string
}

interface TripStop {
  id: string; tripId: string; savedLocationId: string | null
  name: string; location: string | null; latitude: number | null; longitude: number | null
  day: number; order: number; notes: string | null; arrivalTime: string | null; departureTime: string | null
  links: StopLink[] | null; shoppingList: ShoppingItem[] | null
  linkedRequests: { id: string; title: string }[] | null
  linkedEvents: { id: string; title: string }[] | null
  linkedProducts: { id: string; title: string }[] | null
  savedLocation?: UserLocation | null
}

interface TripCollab {
  id: string; userId: string; role: string; status: string
  user: { id: string; name: string | null; image: string | null }
}

interface Trip {
  id: string; title: string; description: string | null; notes: string | null; coverImage: string | null
  startDate: string | null; endDate: string | null; isPublic: boolean
  userId: string; createdAt: string
  stops: TripStop[]
  collaborators: TripCollab[]
  user?: { id: string; name: string | null; image: string | null }
}

interface MapItem {
  id: string; type: string; title: string; lat: number; lng: number
  url: string; image: string | null; meta?: string
}

const POI_TYPES = [
  { key: 'shop', label: 'Shops', icon: '🛍️', color: '#f59e0b' },
  { key: 'product', label: 'Products', icon: '📦', color: '#3b82f6' },
  { key: 'event', label: 'Events', icon: '📅', color: '#ef4444' },
  { key: 'plan', label: 'Plans', icon: '📋', color: '#8b5cf6' },
  { key: 'request', label: 'Requests', icon: '🙏', color: '#10b981' },
  { key: 'rental', label: 'Rentals', icon: '🏠', color: '#06b6d4' },
  { key: 'service', label: 'Services', icon: '🔧', color: '#84cc16' },
]

export default function PlanningPage() {
  const { data: session } = useSession()
  const [trips, setTrips] = useState<Trip[]>([])
  const [sharedTrips, setSharedTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [savedLocations, setSavedLocations] = useState<UserLocation[]>([])
  const [categories, setCategories] = useState<LocationCategory[]>([])
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState('stops')
  const [mapReady, setMapReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddStop, setShowAddStop] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeout(() => setMapReady(true), 100)
    }
  }, [])

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch('/api/trips')
      if (res.ok) {
        const data = await res.json()
        setTrips(data.owned || [])
        setSharedTrips(data.shared || [])
      }
    } catch {}
  }, [])

  const fetchLocations = useCallback(async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        fetch('/api/users/locations'),
        fetch('/api/locations/categories')
      ])
      if (locRes.ok) setSavedLocations(await locRes.json())
      if (catRes.ok) setCategories(await catRes.json())
    } catch {}
  }, [])

  useEffect(() => { fetchTrips(); fetchLocations() }, [fetchTrips, fetchLocations])

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip)
    setActiveTab('stops')
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Trips</h2>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setShowModal(true)}>+ New</button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            className={styles.formInput}
            placeholder="Search trips..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '2rem' }}
          />
          <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
        </div>
        <div className={styles.tripList}>
          {trips.length === 0 && sharedTrips.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>🗺️</div>
              <p>No trips yet. Create your first trip!</p>
            </div>
          ) : (
            <>
              {trips.map(trip => (
                <div
                  key={trip.id}
                  className={`${styles.tripCard} ${selectedTrip?.id === trip.id ? styles.tripCardActive : ''}`}
                  onClick={() => handleSelectTrip(trip)}
                >
                  <div className={styles.tripCardTitle}>{trip.title}</div>
                  <div className={styles.tripCardMeta}>
                    <span>{trip.stops?.length || 0} stops</span>
                    {trip.startDate && <span>{new Date(trip.startDate).toLocaleDateString()}</span>}
                    {trip.isPublic && <span className={styles.tripCardBadge}>Public</span>}
                  </div>
                </div>
              ))}
              {sharedTrips.map(trip => (
                <div
                  key={trip.id}
                  className={`${styles.tripCard} ${selectedTrip?.id === trip.id ? styles.tripCardActive : ''}`}
                  onClick={() => handleSelectTrip(trip)}
                >
                  <div className={styles.tripCardTitle}>{trip.title}</div>
                  <div className={styles.tripCardMeta}>
                    <span>{trip.stops?.length || 0} stops</span>
                    {trip.startDate && <span>{new Date(trip.startDate).toLocaleDateString()}</span>}
                  </div>
                  <div className={styles.tripCardOwner}>Shared by {trip.user?.name || 'someone'}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </aside>

      <main className={styles.main}>
        {selectedTrip ? <TripDetail
          trip={selectedTrip}
          savedLocations={savedLocations}
          categories={categories}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          session={session}
          mapReady={mapReady}
          onUpdate={fetchTrips}
          showAddStop={showAddStop}
          setShowAddStop={setShowAddStop}
        /> : (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>🗺️</div>
            <p>Select a trip or create a new one to get started</p>
          </div>
        )}
      </main>

      {showModal && <NewTripModal
        onClose={() => setShowModal(false)}
        onCreated={(trip) => { setShowModal(false); setSelectedTrip(trip); fetchTrips() }}
      />}
    </div>
  )
}

function TripDetail({ trip: initialTrip, savedLocations, categories, activeTab, setActiveTab, session, mapReady, onUpdate, showAddStop, setShowAddStop }: {
  trip: Trip; savedLocations: UserLocation[]; categories: LocationCategory[]
  activeTab: string; setActiveTab: (t: string) => void
  session: any; mapReady: boolean; onUpdate: () => void
  showAddStop: boolean; setShowAddStop: (v: boolean) => void
}) {
  const [trip, setTrip] = useState(initialTrip)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(trip.title)
  const [editDesc, setEditDesc] = useState(trip.description || '')
  const [editNotes, setEditNotes] = useState((trip as any).notes || '')
  const [editStart, setEditStart] = useState(trip.startDate?.split('T')[0] || '')
  const [editEnd, setEditEnd] = useState(trip.endDate?.split('T')[0] || '')
  const [editPublic, setEditPublic] = useState(trip.isPublic)
  const [inviteUsername, setInviteUsername] = useState('')
  const [addingCustomStop, setAddingCustomStop] = useState(false)
  const [customStopName, setCustomStopName] = useState('')
  const [customStopLoc, setCustomStopLoc] = useState('')
  const [customStopNotes, setCustomStopNotes] = useState('')
  const [customStopArrival, setCustomStopArrival] = useState('')
  const [customStopDeparture, setCustomStopDeparture] = useState('')
  const [customStopLat, setCustomStopLat] = useState<number | null>(null)
  const [customStopLng, setCustomStopLng] = useState<number | null>(null)
  const [customStopSearch, setCustomStopSearch] = useState('')
  const [saveToProfile, setSaveToProfile] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [poiItems, setPoiItems] = useState<MapItem[]>([])
  const [activePoiTypes, setActivePoiTypes] = useState<Set<string>>(new Set())
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null)
  const [stopLinks, setStopLinks] = useState<Record<string, StopLink[]>>({})
  const [stopShopping, setStopShopping] = useState<Record<string, ShoppingItem[]>>({})
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')
  const [newShopItem, setNewShopItem] = useState('')
  const [newShopQty, setNewShopQty] = useState('')
  const [linkingStopId, setLinkingStopId] = useState<string | null>(null)
  const [linkType, setLinkType] = useState<'request' | 'event' | 'product' | null>(null)
  const [linkSearch, setLinkSearch] = useState('')
  const [linkResults, setLinkResults] = useState<any[]>([])
  const [linkSearching, setLinkSearching] = useState(false)
  const [newRequestTitle, setNewRequestTitle] = useState('')
  const [newRequestDesc, setNewRequestDesc] = useState('')
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const mapRef = useRef<any>(null)

  useEffect(() => { setTrip(initialTrip); setEditTitle(initialTrip.title); setEditDesc(initialTrip.description || ''); setEditNotes(initialTrip.notes || ''); setEditStart(initialTrip.startDate?.split('T')[0] || ''); setEditEnd(initialTrip.endDate?.split('T')[0] || ''); setEditPublic(initialTrip.isPublic) }, [initialTrip])

  useEffect(() => {
    if (trip.stops) {
      const links: Record<string, StopLink[]> = {}
      const shopping: Record<string, ShoppingItem[]> = {}
      for (const s of trip.stops) {
        links[s.id] = s.links || []
        shopping[s.id] = s.shoppingList || []
      }
      setStopLinks(links)
      setStopShopping(shopping)
    }
  }, [trip.stops])

  const fetchPoi = useCallback(async () => {
    try {
      const res = await fetch('/api/map-data')
      if (res.ok) {
        const data = await res.json()
        setPoiItems(data.items || [])
      }
    } catch {}
  }, [])

  const isOwner = trip.userId === session?.user?.id
  const canEdit = isOwner || trip.collaborators?.some(c => c.userId === session?.user?.id && c.role === 'EDITOR')

  const handleSaveInfo = async () => {
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc, notes: editNotes, startDate: editStart, endDate: editEnd, isPublic: editPublic })
    })
    if (res.ok) { setEditing(false); const updated = await res.json(); setTrip(updated); onUpdate() }
  }

  const handleAddStop = async (location: UserLocation) => {
    const lastStop = trip.stops?.length ? trip.stops[trip.stops.length - 1] : null
    const day = lastStop?.day ?? 0
    const order = lastStop?.day === day ? (lastStop?.order ?? 0) + 1 : 0
    const res = await fetch(`/api/trips/${trip.id}/stops`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: location.name, location: location.location,
        latitude: location.latitude, longitude: location.longitude,
        savedLocationId: location.id, day, order
      })
    })
    if (res.ok) { const updated = await res.json(); setTrip(prev => ({ ...prev, stops: [...(prev.stops || []), updated] })); onUpdate() }
  }

  const handleAddCustomStop = async () => {
    if (!customStopName.trim() || customStopLat == null || customStopLng == null) return
    const lastStop = trip.stops?.length ? trip.stops[trip.stops.length - 1] : null
    const day = lastStop?.day ?? 0
    const order = lastStop?.day === day ? (lastStop?.order ?? 0) + 1 : 0

    let savedLocationId: string | undefined
    if (saveToProfile) {
      try {
        const locRes = await fetch('/api/users/locations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customStopName, location: customStopLoc || null, latitude: customStopLat, longitude: customStopLng })
        })
        if (locRes.ok) {
          const saved = await locRes.json()
          savedLocationId = saved.id
        }
      } catch {}
    }

    const res = await fetch(`/api/trips/${trip.id}/stops`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customStopName.trim(), location: customStopLoc || null,
        latitude: customStopLat, longitude: customStopLng,
        notes: customStopNotes || null, arrivalTime: customStopArrival || null,
        departureTime: customStopDeparture || null, day, order,
        savedLocationId
      })
    })
    if (res.ok) {
      const updated = await res.json()
      setTrip(prev => ({ ...prev, stops: [...(prev.stops || []), updated] }))
      onUpdate()
      setAddingCustomStop(false)
      setCustomStopName(''); setCustomStopLoc(''); setCustomStopNotes('')
      setCustomStopArrival(''); setCustomStopDeparture('')
      setCustomStopLat(null); setCustomStopLng(null); setCustomStopSearch('')
      setSaveToProfile(false)
    }
  }

  const handleGeocodeSearch = async () => {
    if (!customStopSearch.trim()) return
    setGeoLoading(true)
    try {
      const result = await geocodeLocation(customStopSearch)
      if (result) {
        setCustomStopLoc(result.displayName)
        setCustomStopLat(result.latitude)
        setCustomStopLng(result.longitude)
        if (!customStopName) setCustomStopName(customStopSearch)
      }
    } finally { setGeoLoading(false) }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    setCustomStopLat(lat); setCustomStopLng(lng)
    const addr = await reverseGeocodeLocation(lat, lng)
    if (addr) {
      setCustomStopLoc(addr)
    }
  }

  const handleRemoveStop = async (stopId: string) => {
    const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, { method: 'DELETE' })
    if (res.ok) { setTrip(prev => ({ ...prev, stops: (prev.stops || []).filter(s => s.id !== stopId) })); onUpdate() }
  }

  const handleMoveStop = async (stopId: string, day: number, order: number) => {
    const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, order })
    })
    if (res.ok) { const updated = await res.json(); setTrip(prev => ({ ...prev, stops: (prev.stops || []).map(s => s.id === stopId ? updated : s) })); onUpdate() }
  }

  const handleUpdateStopField = async (stopId: string, data: Record<string, any>) => {
    const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) { const updated = await res.json(); setTrip(prev => ({ ...prev, stops: (prev.stops || []).map(s => s.id === stopId ? updated : s) })) }
  }

  const handleAddLink = async (stopId: string) => {
    if (!newLinkUrl.trim()) return
    const links = [...(stopLinks[stopId] || []), { url: newLinkUrl.trim(), label: newLinkLabel.trim() || newLinkUrl.trim() }]
    setStopLinks(prev => ({ ...prev, [stopId]: links }))
    await handleUpdateStopField(stopId, { links })
    setNewLinkUrl(''); setNewLinkLabel('')
  }

  const handleRemoveLink = async (stopId: string, idx: number) => {
    const links = (stopLinks[stopId] || []).filter((_, i) => i !== idx)
    setStopLinks(prev => ({ ...prev, [stopId]: links }))
    await handleUpdateStopField(stopId, { links })
  }

  const handleAddShoppingItem = async (stopId: string) => {
    if (!newShopItem.trim()) return
    const items = [...(stopShopping[stopId] || []), { name: newShopItem.trim(), quantity: newShopQty || '1', checked: false }]
    setStopShopping(prev => ({ ...prev, [stopId]: items }))
    await handleUpdateStopField(stopId, { shoppingList: items })
    setNewShopItem(''); setNewShopQty('')
  }

  const handleToggleShoppingItem = async (stopId: string, idx: number) => {
    const items = (stopShopping[stopId] || []).map((item, i) => i === idx ? { ...item, checked: !item.checked } : item)
    setStopShopping(prev => ({ ...prev, [stopId]: items }))
    await handleUpdateStopField(stopId, { shoppingList: items })
  }

  const handleRemoveShoppingItem = async (stopId: string, idx: number) => {
    const items = (stopShopping[stopId] || []).filter((_, i) => i !== idx)
    setStopShopping(prev => ({ ...prev, [stopId]: items }))
    await handleUpdateStopField(stopId, { shoppingList: items })
  }

  const handleAddPoiStop = async (item: MapItem) => {
    const lastStop = trip.stops?.length ? trip.stops[trip.stops.length - 1] : null
    const day = lastStop?.day ?? 0
    const order = lastStop?.day === day ? (lastStop?.order ?? 0) + 1 : 0
    const res = await fetch(`/api/trips/${trip.id}/stops`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: item.title, location: null, latitude: item.lat, longitude: item.lng,
        day, order, links: [{ url: item.url, label: `View ${item.type}` }]
      })
    })
    if (res.ok) { const updated = await res.json(); setTrip(prev => ({ ...prev, stops: [...(prev.stops || []), updated] })); onUpdate() }
  }

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return
    try {
      const userRes = await fetch(`/api/users/search?q=${encodeURIComponent(inviteUsername.trim())}`)
      if (!userRes.ok) return
      const users = await userRes.json()
      const found = users?.[0]
      if (!found?.id) return
      const res = await fetch(`/api/trips/${trip.id}/collaborators`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: found.id, role: 'EDITOR' })
      })
      if (res.ok) { setInviteUsername(''); onUpdate(); const refreshed = await fetch(`/api/trips/${trip.id}`).then(r => r.json()); setTrip(refreshed) }
    } catch {}
  }

  const handleCollabAction = async (collabId: string, action: string) => {
    const res = await fetch(`/api/trips/${trip.id}/collaborators/${collabId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action })
    })
    if (res.ok) { onUpdate(); const refreshed = await fetch(`/api/trips/${trip.id}`).then(r => r.json()); setTrip(refreshed) }
  }

  const handleLinkSearch = async (query: string, type: string) => {
    setLinkSearch(query)
    if (query.length < 2) { setLinkResults([]); return }
    setLinkSearching(true)
    try {
      let res
      if (type === 'request') res = await fetch(`/api/requests?search=${encodeURIComponent(query)}&take=10`)
      else if (type === 'event') res = await fetch(`/api/events?search=${encodeURIComponent(query)}&take=10`)
      else res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        if (type === 'product') setLinkResults(data.products || [])
        else if (type === 'request') setLinkResults(data.requests || (Array.isArray(data) ? data : []))
        else setLinkResults(Array.isArray(data) ? data : [])
      }
    } catch {} finally { setLinkSearching(false) }
  }

  const handleLinkItem = async (stopId: string, type: string, item: { id: string; title: string }) => {
    const stop = trip.stops?.find(s => s.id === stopId)
    if (!stop) return

    if (type === 'product') {
      const res = await fetch(`/api/trips/${trip.id}/stops/${stopId}/link-product`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: item.id })
      })
      if (res.ok) { const updated = await res.json(); setTrip(prev => ({ ...prev, stops: (prev.stops || []).map(s => s.id === stopId ? updated : s) })) }
    } else if (type === 'request') {
      const linkedRequests = [...(stop.linkedRequests || []), item]
      await handleUpdateStopField(stopId, { linkedRequests })
    } else if (type === 'event') {
      const linkedEvents = [...(stop.linkedEvents || []), item]
      await handleUpdateStopField(stopId, { linkedEvents })
    }
    setLinkingStopId(null); setLinkType(null); setLinkSearch(''); setLinkResults([])
  }

  const handleUnlinkItem = async (stopId: string, type: string, itemId: string) => {
    const stop = trip.stops?.find(s => s.id === stopId)
    if (!stop) return

    if (type === 'product') {
      const linkedProducts = (stop.linkedProducts || []).filter(p => p.id !== itemId)
      await handleUpdateStopField(stopId, { linkedProducts })
    } else if (type === 'request') {
      const linkedRequests = (stop.linkedRequests || []).filter(r => r.id !== itemId)
      await handleUpdateStopField(stopId, { linkedRequests })
    } else if (type === 'event') {
      const linkedEvents = (stop.linkedEvents || []).filter(e => e.id !== itemId)
      await handleUpdateStopField(stopId, { linkedEvents })
    }
  }

  const handleCreateAndLinkRequest = async (stopId: string) => {
    if (!newRequestTitle.trim()) return
    const res = await fetch(`/api/trips/${trip.id}/requests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newRequestTitle, description: newRequestDesc, stopId })
    })
    if (res.ok) {
      const created = await res.json()
      const stop = trip.stops?.find(s => s.id === stopId)
      if (stop) {
        const linkedRequests = [...(stop.linkedRequests || []), { id: created.id, title: created.title }]
        await handleUpdateStopField(stopId, { linkedRequests })
      }
      setNewRequestTitle(''); setNewRequestDesc('')
    }
  }

  const handleCreateAndLinkEvent = async (stopId: string) => {
    if (!newEventTitle.trim()) return
    const stop = trip.stops?.find(s => s.id === stopId)
    const res = await fetch(`/api/trips/${trip.id}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newEventTitle, eventDate: newEventDate || null, location: stop?.location, latitude: stop?.latitude, longitude: stop?.longitude, stopId })
    })
    if (res.ok) {
      const created = await res.json()
      if (stop) {
        const linkedEvents = [...(stop.linkedEvents || []), { id: created.id, title: created.title }]
        await handleUpdateStopField(stopId, { linkedEvents })
      }
      setNewEventTitle(''); setNewEventDate('')
    }
  }

  const handleRemoveCollab = async (collabId: string) => {
    const res = await fetch(`/api/trips/${trip.id}/collaborators/${collabId}`, { method: 'DELETE' })
    if (res.ok) { onUpdate(); const refreshed = await fetch(`/api/trips/${trip.id}`).then(r => r.json()); setTrip(refreshed) }
  }

  const days = trip.stops?.length ? [...new Set(trip.stops.map(s => s.day))].sort((a, b) => a - b) : []
  const orderedStops = (day: number) => (trip.stops || []).filter(s => s.day === day).sort((a, b) => a.order - b.order)
  const coords = trip.stops?.filter(s => s.latitude && s.longitude).map(s => [s.latitude!, s.longitude!] as [number, number]) || []

  const MapClickHandlerComponent = dynamic(() => import('@/components/MapClickHandler').then(m => m.default), { ssr: false })

  function TogglePoiType(key: string) {
    setActivePoiTypes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (next.size === 1) fetchPoi()
      return next
    })
  }

  const filteredPoi = poiItems.filter(item => activePoiTypes.has(item.type))

  return (
    <>
      <div className={styles.mainHeader}>
        <div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <input className={styles.formInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Trip title" />
              <textarea className={styles.formTextarea} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2} />
              <textarea className={styles.formTextarea} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Trip notes..." rows={2} style={{ marginTop: '0.5rem' }} />
              <div className={styles.formRow}>
                <div><label className={styles.formLabel}>Start</label><input className={styles.formInput} type="date" value={editStart} onChange={e => setEditStart(e.target.value)} /></div>
                <div><label className={styles.formLabel}>End</label><input className={styles.formInput} type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} /></div>
              </div>
              <label className={styles.formCheckbox}><input type="checkbox" checked={editPublic} onChange={e => setEditPublic(e.target.checked)} /> Public trip</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSaveInfo}>Save</button>
                <button className={styles.btn} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className={styles.mainTitle}>{trip.title}</h1>
              {trip.description && <p className={styles.mainDesc}>{trip.description}</p>}
              {trip.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{trip.notes}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {trip.startDate && <span>📅 {new Date(trip.startDate).toLocaleDateString()}{trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ''}</span>}
                <span>{trip.stops?.length || 0} stops</span>
                {trip.isPublic && <span>🌍 Public</span>}
                {!isOwner && trip.user && <span>👤 by {trip.user.name}</span>}
              </div>
            </>
          )}
        </div>
        {canEdit && !editing && (
          <div className={styles.mainActions}>
            <button className={styles.btn} onClick={() => setEditing(true)}>✏️ Edit</button>
          </div>
        )}
      </div>

      <div className={styles.tripTabs}>
        <button className={`${styles.tripTab} ${activeTab === 'stops' ? styles.tripTabActive : ''}`} onClick={() => setActiveTab('stops')}>📍 Stops</button>
        <button className={`${styles.tripTab} ${activeTab === 'map' ? styles.tripTabActive : ''}`} onClick={() => setActiveTab('map')}>🗺️ Map</button>
        <button className={`${styles.tripTab} ${activeTab === 'share' ? styles.tripTabActive : ''}`} onClick={() => setActiveTab('share')}>👥 Share</button>
      </div>

      {activeTab === 'stops' && (
        <>
          {canEdit && (
            <div style={{ marginBottom: '1rem' }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAddingCustomStop(true)}>
                + Add Custom Location
              </button>
            </div>
          )}

          {addingCustomStop && (
            <div className={styles.card} style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Add Location</h4>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Search for a place</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input className={styles.formInput} value={customStopSearch} onChange={e => setCustomStopSearch(e.target.value)}
                    placeholder="e.g., Central Park, New York" onKeyDown={e => e.key === 'Enter' && handleGeocodeSearch()} />
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleGeocodeSearch} disabled={geoLoading}>
                    {geoLoading ? '...' : 'Search'}
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Click on the map to drop a pin, or search above
              </p>
              {mapReady && (
                <div style={{ height: '250px', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem' }}>
                  <MapContainer center={customStopLat != null ? [customStopLat, customStopLng!] : [20, 0]} zoom={customStopLat != null ? 14 : 2} style={{ width: '100%', height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapClickHandlerComponent onClick={handleMapClick} />
                    {customStopLat != null && customStopLng != null && (
                      <Marker position={[customStopLat, customStopLng]}>
                        <Popup>{customStopLoc || customStopName}</Popup>
                      </Marker>
                    )}
                  </MapContainer>
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name *</label>
                <input className={styles.formInput} value={customStopName} onChange={e => setCustomStopName(e.target.value)} placeholder="Stop name" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Address</label>
                <input className={styles.formInput} value={customStopLoc} onChange={e => setCustomStopLoc(e.target.value)} placeholder="Address or place description" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Arrival</label>
                  <input className={styles.formInput} type="time" value={customStopArrival} onChange={e => setCustomStopArrival(e.target.value)} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Departure</label>
                  <input className={styles.formInput} type="time" value={customStopDeparture} onChange={e => setCustomStopDeparture(e.target.value)} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes</label>
                <textarea className={styles.formTextarea} value={customStopNotes} onChange={e => setCustomStopNotes(e.target.value)} rows={2} placeholder="Notes about this stop..." />
              </div>
              <label className={styles.formCheckbox} style={{ marginBottom: '0.75rem' }}>
                <input type="checkbox" checked={saveToProfile} onChange={e => setSaveToProfile(e.target.checked)} />
                Save to my places
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddCustomStop} disabled={!customStopName.trim() || customStopLat == null}>
                  Add Stop
                </button>
                <button className={styles.btn} onClick={() => { setAddingCustomStop(false); setCustomStopName(''); setCustomStopLoc(''); setCustomStopNotes(''); setCustomStopArrival(''); setCustomStopDeparture(''); setCustomStopLat(null); setCustomStopLng(null); setCustomStopSearch(''); setSaveToProfile(false) }}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {canEdit && savedLocations.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Add from saved locations</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {savedLocations.filter(l => !trip.stops?.some(s => s.savedLocationId === l.id)).map(loc => (
                  <button key={loc.id} className={styles.btn} onClick={() => handleAddStop(loc)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{loc.category?.icon || '📍'}</span>
                    <span>{loc.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.stopsList}>
            {days.length === 0 && !addingCustomStop ? (
              <div className={styles.emptyState}>
                <p>No stops yet. Add a custom location or use saved places.</p>
              </div>
            ) : days.map(day => (
              <div key={day}>
                <div className={styles.dayHeader}>
                  Day {day + 1}
                  {trip.startDate && <span style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
                    {new Date(new Date(trip.startDate).getTime() + day * 86400000).toLocaleDateString()}
                  </span>}
                </div>
                {orderedStops(day).map(stop => (
                  <div key={stop.id} className={styles.stopCard}>
                    <div className={styles.stopNumber}>{stop.order + 1}</div>
                    <div className={styles.stopInfo}>
                      <div className={styles.stopName}>{stop.name}</div>
                      {stop.location && <div className={styles.stopLocation}>{stop.location}</div>}
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {stop.arrivalTime && <span className={styles.stopTime}>🕐 {stop.arrivalTime}{stop.departureTime ? ` - ${stop.departureTime}` : ''}</span>}
                        {stop.notes && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📝 Notes</span>}
                        {(stop.shoppingList?.length || 0) > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🛒 {stop.shoppingList!.filter(i => !i.checked).length} items</span>}
                        {(stop.links?.length || 0) > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔗 {stop.links!.length} links</span>}
                      </div>

                      {canEdit && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => setExpandedStopId(expandedStopId === stop.id ? null : stop.id)}>
                            {expandedStopId === stop.id ? '▲ Collapse' : '▼ Details'}
                          </button>
                        </div>
                      )}

                      {expandedStopId === stop.id && canEdit && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                          {/* Notes */}
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Notes</label>
                            <textarea className={styles.formTextarea} value={stop.notes || ''} onChange={e => handleUpdateStopField(stop.id, { notes: e.target.value })} rows={2} placeholder="Notes..." />
                          </div>

                          {/* Arrival/Departure */}
                          <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>Arrival</label>
                              <input className={styles.formInput} type="time" value={stop.arrivalTime || ''} onChange={e => handleUpdateStopField(stop.id, { arrivalTime: e.target.value || null })} />
                            </div>
                            <div className={styles.formGroup}>
                              <label className={styles.formLabel}>Departure</label>
                              <input className={styles.formInput} type="time" value={stop.departureTime || ''} onChange={e => handleUpdateStopField(stop.id, { departureTime: e.target.value || null })} />
                            </div>
                          </div>

                          {/* Shopping List */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <label className={styles.formLabel}>🛒 Shopping List</label>
                            {(stopShopping[stop.id] || []).map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                                <input type="checkbox" checked={item.checked} onChange={() => handleToggleShoppingItem(stop.id, idx)} />
                                <span style={{ textDecoration: item.checked ? 'line-through' : 'none', flex: 1, fontSize: '0.9rem' }}>{item.name}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.quantity}</span>
                                <button className={styles.btnIcon} onClick={() => handleRemoveShoppingItem(stop.id, idx)}>🗑️</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                              <input className={styles.formInput} value={newShopItem} onChange={e => setNewShopItem(e.target.value)}
                                placeholder="Item name" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleAddShoppingItem(stop.id)} />
                              <input className={styles.formInput} value={newShopQty} onChange={e => setNewShopQty(e.target.value)}
                                placeholder="Qty" style={{ width: '60px' }} />
                              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleAddShoppingItem(stop.id)}>+</button>
                            </div>
                          </div>

                          {/* Linked Items */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <label className={styles.formLabel}>🔗 Linked Items</label>
                            {(stop.linkedRequests || []).length > 0 && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Requests:</span>
                                {(stop.linkedRequests || []).map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                                    <a href={`/requests/${item.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', flex: 1 }}>{item.title}</a>
                                    <button className={styles.btnIcon} onClick={() => handleUnlinkItem(stop.id, 'request', item.id)}>🗑️</button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(stop.linkedEvents || []).length > 0 && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Events:</span>
                                {(stop.linkedEvents || []).map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                                    <a href={`/events/${item.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', flex: 1 }}>{item.title}</a>
                                    <button className={styles.btnIcon} onClick={() => handleUnlinkItem(stop.id, 'event', item.id)}>🗑️</button>
                                  </div>
                                ))}
                              </div>
                            )}
                            {(stop.linkedProducts || []).length > 0 && (
                              <div style={{ marginBottom: '0.25rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Products:</span>
                                {(stop.linkedProducts || []).map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                                    <a href={`/products/${item.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', flex: 1 }}>{item.title}</a>
                                    <button className={styles.btnIcon} onClick={() => handleUnlinkItem(stop.id, 'product', item.id)}>🗑️</button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setLinkingStopId(stop.id); setLinkType('request'); setLinkSearch(''); setLinkResults([]) }}>
                                📝 + Request
                              </button>
                              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setLinkingStopId(stop.id); setLinkType('event'); setLinkSearch(''); setLinkResults([]) }}>
                                📅 + Event
                              </button>
                              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setLinkingStopId(stop.id); setLinkType('product'); setLinkSearch(''); setLinkResults([]) }}>
                                🛒 + Product
                              </button>
                            </div>
                          </div>

                          {/* Link Search Modal */}
                          {linkingStopId === stop.id && linkType && (
                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                <input className={styles.formInput} value={linkSearch} onChange={e => handleLinkSearch(e.target.value, linkType)}
                                  placeholder={`Search ${linkType}s...`} style={{ flex: 1 }} />
                                <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setLinkingStopId(null); setLinkType(null) }}>✕</button>
                              </div>
                              {linkSearching && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</p>}
                              {linkResults.map((item: any) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                  <span style={{ fontSize: '0.85rem' }}>{item.title}</span>
                                  <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleLinkItem(stop.id, linkType, { id: item.id, title: item.title })}>
                                    + Link
                                  </button>
                                </div>
                              ))}
                              {!linkSearching && linkSearch.length >= 2 && linkResults.length === 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>No results. Create new {linkType}:</p>
                                  {linkType === 'request' && (
                                    <div>
                                      <input className={styles.formInput} value={newRequestTitle} onChange={e => setNewRequestTitle(e.target.value)} placeholder="Request title" style={{ marginBottom: '0.25rem' }} />
                                      <input className={styles.formInput} value={newRequestDesc} onChange={e => setNewRequestDesc(e.target.value)} placeholder="Description (optional)" style={{ marginBottom: '0.25rem' }} />
                                      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleCreateAndLinkRequest(stop.id)}>Create & Link</button>
                                    </div>
                                  )}
                                  {linkType === 'event' && (
                                    <div>
                                      <input className={styles.formInput} value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Event title" style={{ marginBottom: '0.25rem' }} />
                                      <input className={styles.formInput} type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} placeholder="Date" style={{ marginBottom: '0.25rem' }} />
                                      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleCreateAndLinkEvent(stop.id)}>Create & Link</button>
                                    </div>
                                  )}
                                  {linkType === 'product' && (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Try a different search term</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Links */}
                          <div style={{ marginTop: '0.75rem' }}>
                            <label className={styles.formLabel}>🔗 Links</label>
                            {(stopLinks[stop.id] || []).map((link, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
                                <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', flex: 1 }}>{link.label}</a>
                                <button className={styles.btnIcon} onClick={() => handleRemoveLink(stop.id, idx)}>🗑️</button>
                              </div>
                            ))}
                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
                              <input className={styles.formInput} value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                                placeholder="URL" style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleAddLink(stop.id)} />
                              <input className={styles.formInput} value={newLinkLabel} onChange={e => setNewLinkLabel(e.target.value)}
                                placeholder="Label" style={{ width: '120px' }} />
                              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleAddLink(stop.id)}>+</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <div className={styles.stopActions}>
                        {day > 0 && (
                          <button className={styles.btnIcon} onClick={() => handleMoveStop(stop.id, day - 1, orderedStops(day - 1).length)} title="Move to previous day">⬆️</button>
                        )}
                        {day < (days.length - 1 || 0) && (
                          <button className={styles.btnIcon} onClick={() => handleMoveStop(stop.id, day + 1, orderedStops(day + 1).length)} title="Move to next day">⬇️</button>
                        )}
                        <button className={styles.btnIcon} onClick={() => handleRemoveStop(stop.id)} title="Remove">🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'map' && mapReady && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {POI_TYPES.map(pt => (
              <button
                key={pt.key}
                className={`${styles.btn} ${activePoiTypes.has(pt.key) ? styles.btnPrimary : ''}`}
                onClick={() => TogglePoiType(pt.key)}
                style={{ fontSize: '0.85rem' }}
              >
                {pt.icon} {pt.label}
              </button>
            ))}
          </div>
          <div className={styles.mapContainer}>
            <MapContainer center={coords.length > 0 ? [coords[0][0], coords[0][1]] : [20, 0]} zoom={coords.length > 0 ? 5 : 2} style={{ width: '100%', height: '100%' }} ref={mapRef}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {trip.stops?.filter(s => s.latitude && s.longitude).map(s => (
                <Marker key={s.id} position={[s.latitude!, s.longitude!]}>
                  <Popup>
                    <strong>{s.name}</strong>
                    {s.location && <br />}{s.location}
                    {s.notes && <><br /><em>{s.notes}</em></>}
                  </Popup>
                </Marker>
              ))}
              {coords.length > 1 && <Polyline positions={coords} color="#3b82f6" weight={3} opacity={0.6} />}
              {filteredPoi.map(item => (
                <Marker key={`poi-${item.type}-${item.id}`} position={[item.lat, item.lng]}>
                  <Popup>
                    <strong>{item.title}</strong>
                    {item.meta && <><br /><span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.meta}</span></>}
                    <br />
                    <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }}>View</a>
                    {canEdit && (
                      <> | <button onClick={() => handleAddPoiStop(item)} style={{ fontSize: '0.85rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent-primary)', padding: 0 }}>+ Add to trip</button></>
                    )}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {activeTab === 'share' && (
        <div>
          <h3 style={{ fontWeight: 600, marginBottom: '0.75rem' }}>Collaborators</h3>
          <div className={styles.collabList}>
            {trip.collaborators?.filter(c => c.status === 'ACCEPTED').map(c => (
              <div key={c.id} className={styles.collabRow}>
                {c.user.image ? (
                  <img src={c.user.image} alt="" className={styles.collabAvatar} />
                ) : (
                  <div className={styles.collabAvatar}>{(c.user.name || '?')[0]}</div>
                )}
                <span className={styles.collabName}>{c.user.name || 'Unknown'}{c.userId === trip.userId ? ' (Owner)' : ''}</span>
                <span className={styles.collabRole}>{c.role}</span>
                {isOwner && c.userId !== session?.user?.id && (
                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleRemoveCollab(c.id)}>Remove</button>
                )}
              </div>
            ))}
            {trip.collaborators?.filter(c => c.status === 'PENDING').map(c => (
              <div key={c.id} className={styles.collabRow}>
                {c.user.image ? (
                  <img src={c.user.image} alt="" className={styles.collabAvatar} />
                ) : (
                  <div className={styles.collabAvatar}>{(c.user.name || '?')[0]}</div>
                )}
                <span className={styles.collabName}>{c.user.name || 'Unknown'}</span>
                <span className={styles.collabRole}>Invited</span>
                {c.userId === session?.user?.id && (
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => handleCollabAction(c.id, 'ACCEPTED')}>Accept</button>
                    <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => handleCollabAction(c.id, 'DECLINED')}>Decline</button>
                  </div>
                )}
                {isOwner && (
                  <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleRemoveCollab(c.id)}>Cancel</button>
                )}
              </div>
            ))}
          </div>

          {isOwner && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className={styles.formInput}
                placeholder="Invite by username..."
                value={inviteUsername}
                onChange={e => setInviteUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                style={{ maxWidth: '300px' }}
              />
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleInvite}>Invite</button>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Share Link</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {trip.isPublic
                ? 'Anyone with this link can view this trip.'
                : 'Make the trip public to share with anyone.'}
            </p>
            {trip.isPublic && (
              <input
                className={styles.formInput}
                value={`${window.location.origin}/trips/${trip.id}`}
                readOnly
                onClick={e => (e.target as HTMLInputElement).select()}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

function NewTripModal({ onClose, onCreated }: { onClose: () => void; onCreated: (trip: Trip) => void }) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [creating, setCreating] = useState(false)

  const steps = ['Details', 'Dates', 'Review']

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description, startDate, endDate, isPublic })
      })
      if (res.ok) {
        const trip = await res.json()
        onCreated(trip)
      }
    } finally { setCreating(false) }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Trip</h2>
          <button className={styles.btnIcon} onClick={onClose}>✕</button>
        </div>

        <div className={styles.wizardSteps}>
          {steps.map((s, i) => (
            <div key={s} className={`${styles.wizardStep} ${i === step ? styles.wizardStepActive : ''} ${i < step ? styles.wizardStepDone : ''}`}>
              {i < step ? '✓' : i + 1}. {s}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Trip Name *</label>
              <input className={styles.formInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Summer Road Trip" autoFocus />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Description</label>
              <textarea className={styles.formTextarea} value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this trip about?" rows={3} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Start Date</label>
                <input className={styles.formInput} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>End Date</label>
                <input className={styles.formInput} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formCheckbox}>
                <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                Make this trip public (shareable link)
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{title || 'Untitled Trip'}</h3>
            {description && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{description}</p>}
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {startDate && <div>📅 {new Date(startDate).toLocaleDateString()}{endDate ? ` - ${new Date(endDate).toLocaleDateString()}` : ''}</div>}
              <div>🌍 {isPublic ? 'Public' : 'Private'}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button className={styles.btn} onClick={() => step > 0 ? setStep(step - 1) : onClose()} disabled={creating}>
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < steps.length - 1 ? (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setStep(step + 1)} disabled={step === 0 && !title.trim()}>
              Next
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreate} disabled={!title.trim() || creating}>
              {creating ? 'Creating...' : 'Create Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
