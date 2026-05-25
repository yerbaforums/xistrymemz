'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './planning.module.css'

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

interface TripStop {
  id: string; tripId: string; savedLocationId: string | null
  name: string; location: string | null; latitude: number | null; longitude: number | null
  day: number; order: number; notes: string | null; arrivalTime: string | null; departureTime: string | null
  savedLocation?: UserLocation | null
}

interface TripCollab {
  id: string; userId: string; role: string; status: string
  user: { id: string; name: string | null; image: string | null }
}

interface Trip {
  id: string; title: string; description: string | null; coverImage: string | null
  startDate: string | null; endDate: string | null; isPublic: boolean
  userId: string; createdAt: string
  stops: TripStop[]
  collaborators: TripCollab[]
  user?: { id: string; name: string | null; image: string | null }
}

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

function TripDetail({ trip: initialTrip, savedLocations, categories, activeTab, setActiveTab, session, mapReady, onUpdate }: {
  trip: Trip; savedLocations: UserLocation[]; categories: LocationCategory[]
  activeTab: string; setActiveTab: (t: string) => void
  session: any; mapReady: boolean; onUpdate: () => void
}) {
  const [trip, setTrip] = useState(initialTrip)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(trip.title)
  const [editDesc, setEditDesc] = useState(trip.description || '')
  const [editStart, setEditStart] = useState(trip.startDate?.split('T')[0] || '')
  const [editEnd, setEditEnd] = useState(trip.endDate?.split('T')[0] || '')
  const [editPublic, setEditPublic] = useState(trip.isPublic)
  const [inviteUsername, setInviteUsername] = useState('')

  useEffect(() => { setTrip(initialTrip); setEditTitle(initialTrip.title); setEditDesc(initialTrip.description || ''); setEditStart(initialTrip.startDate?.split('T')[0] || ''); setEditEnd(initialTrip.endDate?.split('T')[0] || ''); setEditPublic(initialTrip.isPublic) }, [initialTrip])

  const isOwner = trip.userId === session?.user?.id
  const canEdit = isOwner || trip.collaborators?.some(c => c.userId === session?.user?.id && c.role === 'EDITOR')

  const handleSaveInfo = async () => {
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc, startDate: editStart, endDate: editEnd, isPublic: editPublic })
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

  const handleRemoveCollab = async (collabId: string) => {
    const res = await fetch(`/api/trips/${trip.id}/collaborators/${collabId}`, { method: 'DELETE' })
    if (res.ok) { onUpdate(); const refreshed = await fetch(`/api/trips/${trip.id}`).then(r => r.json()); setTrip(refreshed) }
  }

  const days = trip.stops?.length
    ? [...new Set(trip.stops.map(s => s.day))].sort((a, b) => a - b)
    : []

  const orderedStops = (day: number) =>
    (trip.stops || []).filter(s => s.day === day).sort((a, b) => a.order - b.order)

  const coords = trip.stops?.filter(s => s.latitude && s.longitude).map(s => [s.latitude!, s.longitude!] as [number, number]) || []
  const bounds = coords.length > 0

  return (
    <>
      <div className={styles.mainHeader}>
        <div>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <input className={styles.formInput} value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Trip title" />
              <textarea className={styles.formTextarea} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description" rows={2} />
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
            {days.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No stops yet. Add locations above or edit the trip.</p>
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {stop.arrivalTime && <span className={styles.stopTime}>🕐 {stop.arrivalTime}{stop.departureTime ? ` - ${stop.departureTime}` : ''}</span>}
                      </div>
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
        <div className={styles.mapContainer}>
          <MapContainer center={[20, 0]} zoom={2} style={{ width: '100%', height: '100%' }}>
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
          </MapContainer>
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
