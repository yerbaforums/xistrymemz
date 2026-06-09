'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import CreateBoardModal from '@/components/CreateBoardModal'
import Button from '@/components/ui/Button'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import { useToast } from '@/context/ToastContext'
import { reverseGeocodeLocation, shortenLocation } from '@/lib/geocoding'
import Loading from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const Tooltip = dynamic(() => import('react-leaflet').then(m => m.Tooltip), { ssr: false })
const MapEvents = dynamic(() => import('./MapEvents').then(m => m.MapEvents), { ssr: false })
const MapController = dynamic(() => import('./MapEvents').then(m => m.MapController), { ssr: false })
const BoardMapClickHandler = dynamic(() => import('@/components/BoardMapClickHandler').then(m => m.BoardMapClickHandler), { ssr: false })

interface Board {
  id: string
  name: string
  slug: string
  description: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  distance: number | null
  pinCount: number
  memberCount?: number
  isSystem: boolean
  ownerId: string | null
  createdAt: string
}

interface UserLocation {
  id: string
  location: string
  latitude: number | null
  longitude: number | null
  name: string
}

export default function BoardsPage() {
  const { data: session } = useSession()
  const { location: passportLocation } = usePassportLocation()
  const { success, error } = useToast()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'alpha'>('recent')
  const [view, setView] = useState<'all' | 'map' | 'list'>('all')
  const [myBoards, setMyBoards] = useState(false)

  const sortedBoards = useMemo(() => {
    if (sortBy === 'alpha') {
      return [...boards].sort((a, b) => a.name.localeCompare(b.name))
    }
    return boards
  }, [boards, sortBy])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [settingLocation, setSettingLocation] = useState(false)
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null)
  const initialFitDone = useRef(false)
  const [homeName, setHomeName] = useState('')
  const [mapReady, setMapReady] = useState(false)
  const [L, setL] = useState<any>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    import('leaflet/dist/leaflet.css')
    import('leaflet').then(mod => setL(mod))
  }, [])

  useEffect(() => {
    if (passportLocation?.latitude && passportLocation?.longitude) {
      setHomeCoords([passportLocation.latitude, passportLocation.longitude])
      setHomeName(passportLocation.location || '')
    }
  }, [passportLocation])

  useEffect(() => {
    if (homeCoords && mapRef.current) {
      mapRef.current.flyTo(homeCoords, 12, { duration: 1.5 })
    }
  }, [homeCoords, mapReady])

  const mapCenter: [number, number] = homeCoords || [40.7128, -74.006]

  const getBoardIcon = useCallback((highlighted: boolean, isOwner?: boolean) => {
    if (!L) return undefined
    const borderColor = isOwner ? 'var(--accent-primary)' : '#555'
    const bgColor = isOwner ? 'var(--accent-primary)' : '#2d2d2d'
    const glow = highlighted ? `0 0 0 3px rgba(0,217,255,0.4),` : ''
    return L.divIcon({
      className: '',
      html: `<div style="width:26px;height:28px;background:${bgColor};border:2px solid ${borderColor};border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:${glow}0 2px 6px rgba(0,0,0,0.3);color:white;cursor:pointer;">📌</div>`,
      iconSize: [30, 32],
      iconAnchor: [15, 28],
    })
  }, [L])

  const getPassportIcon = useCallback(() => {
    if (!L) return undefined
    return L.divIcon({
      className: '',
      html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#00d9ff,#7b61ff);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🏠</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    })
  }, [L])

  const fetchBoards = useCallback(async (bounds?: { north: number; south: number; east: number; west: number }, city?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (city) params.set('city', city)
      if (searchQuery && !city) params.set('q', searchQuery)
      if (myBoards) params.set('my', 'true')
      if (bounds) {
        params.set('north', String(bounds.north))
        params.set('south', String(bounds.south))
        params.set('east', String(bounds.east))
        params.set('west', String(bounds.west))
      }

      if (!bounds && !city && typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          )
          params.set('lat', String(pos.coords.latitude))
          params.set('lng', String(pos.coords.longitude))
        } catch (e) { console.error('Geolocation error:', e) }
      }

      const res = await fetch(`/api/boards?${params}`)
      const data = await res.json()
      setBoards(data.boards || [])

      const locBoards = (data.boards || []).filter((b: Board) => b.latitude && b.longitude)
      if (locBoards.length > 0 && mapRef.current && !initialFitDone.current) {
        initialFitDone.current = true
        const bounds = locBoards.map((b: Board) => [b.latitude, b.longitude] as [number, number])
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    } catch (e) { console.error('Fetch boards error:', e) }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  useEffect(() => {
    if (!session?.user?.id) return
    const autoCreateFromLocations = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) return
        const data = await res.json()
        const user = data?.user
        const locations: UserLocation[] = user?.locations || data?.locations || []

        const locsToCheck: { name: string; location: string; lat: number; lng: number }[] = []

        if (user?.latitude && user?.longitude) {
          locsToCheck.push({
            name: user.location || 'Home',
            location: user.location || `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`,
            lat: user.latitude,
            lng: user.longitude,
          })
        }

        for (const loc of locations) {
          if (!loc.latitude || !loc.longitude) continue
          locsToCheck.push({
            name: loc.name || loc.location,
            location: loc.location,
            lat: loc.latitude,
            lng: loc.longitude,
          })
        }

        for (const loc of locsToCheck) {
          const checkRes = await fetch(`/api/boards?lat=${loc.lat}&lng=${loc.lng}&radius=25&limit=1`)
          const checkData = await checkRes.json()
          if (!checkData.boards || checkData.boards.length === 0) {
            await fetch('/api/boards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: `${loc.name} Board`,
                location: loc.location,
                latitude: loc.lat,
                longitude: loc.lng,
              }),
            })
          }
        }
        fetchBoards()
      } catch (e) { console.error('Auto-create error:', e); error('Failed to create boards for locations') }
    }
    autoCreateFromLocations()
  }, [session, fetchBoards])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBoards(undefined, searchQuery.trim())
  }

  const handleMapMove = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    if (!searchQuery) {
      fetchBoards(bounds)
    }
  }, [fetchBoards, searchQuery])

  const handleCardClick = (board: Board) => {
    if (board.latitude && board.longitude) {
      setSelectedBoardId(board.id)
      if (mapRef.current) {
        mapRef.current.flyTo([board.latitude, board.longitude], 14, { duration: 1 })
      }
    }
  }

  const handleFlyToBoard = (e: React.MouseEvent, board: Board) => {
    e.stopPropagation()
    e.preventDefault()
    if (board.latitude && board.longitude && mapRef.current) {
      setSelectedBoardId(board.id)
      mapRef.current.flyTo([board.latitude, board.longitude], 14, { duration: 0.8 })
    }
  }

  const handleCardHover = (boardId: string | null) => {
    setHoveredBoardId(boardId)
  }

  const handleMapClickSetLocation = useCallback(async (e: any) => {
    if (!settingLocation) return
    const { lat, lng } = e.latlng
    setSettingLocation(false)

    const displayName = await reverseGeocodeLocation(lat, lng)
    const locationName = shortenLocation(displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)

    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationName, latitude: lat, longitude: lng }),
      })
      if (res.ok) {
        setHomeCoords([lat, lng])
        setHomeName(locationName)
        success('📍 Home location updated!')
      } else {
        error('Failed to update location')
      }
    } catch {
      error('Failed to update location')
    }
  }, [settingLocation, success, error])

  const handleDetectLocation = useCallback(async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      error('Geolocation not available')
      return
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      const displayName = await reverseGeocodeLocation(lat, lng)
      const locationName = shortenLocation(displayName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`)

      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: locationName, latitude: lat, longitude: lng }),
      })
      if (res.ok) {
        setHomeCoords([lat, lng])
        setHomeName(locationName)
        success('📍 Location auto-detected!')
      } else {
        error('Failed to update location')
      }
    } catch {
      error('Could not detect location. Try setting it manually.')
    }
  }, [success, error])

  const [editBoard, setEditBoard] = useState<Board | null>(null)
  const [deleteBoardId, setDeleteBoardId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [editing, setEditing] = useState(false)

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBoard || !editName.trim()) return
    setEditing(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editBoard.id,
          name: editName.trim(),
          description: editDescription.trim() || null,
          location: editLocation.trim() || null,
          latitude: editLatitude ? parseFloat(editLatitude) : null,
          longitude: editLongitude ? parseFloat(editLongitude) : null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBoards(prev => prev.map(b => b.id === editBoard.id ? { ...b, ...updated } : b))
        setEditBoard(null)
        success('Board updated!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to update')
      }
    } catch { error('Failed to update board') }
    finally { setEditing(false) }
  }

  const handleDelete = async () => {
    if (!deleteBoardId) return
    try {
      const res = await fetch(`/api/boards?id=${deleteBoardId}`, { method: 'DELETE' })
      if (res.ok) {
        setBoards(prev => prev.filter(b => b.id !== deleteBoardId))
        setDeleteBoardId(null)
        success('Board deleted!')
      } else {
        const err = await res.json()
        error(err.error || 'Failed to delete')
      }
    } catch { error('Failed to delete board') }
  }

  const openEdit = (board: Board) => {
    setEditBoard(board)
    setEditName(board.name)
    setEditDescription(board.description || '')
    setEditLocation(board.location || '')
    setEditLatitude(board.latitude?.toString() || '')
    setEditLongitude(board.longitude?.toString() || '')
  }

  const handleFlyHome = useCallback(() => {
    if (homeCoords && mapRef.current) {
      mapRef.current.flyTo(homeCoords, 12, { duration: 1 })
    }
  }, [homeCoords])

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Boards' },
      ]} />
      <div className={styles.hero}>
        <h1>📌 Community Bulletin Boards</h1>
        <p>Pin your cards, announcements, and listings to local boards</p>
        <div className={styles.viewToggleBar}>
          <button className={`${styles.viewToggleBtn} ${view === 'all' ? styles.viewToggleActive : ''}`} onClick={() => setView('all')}>🗺️ Map + List</button>
          <button className={`${styles.viewToggleBtn} ${view === 'map' ? styles.viewToggleActive : ''}`} onClick={() => setView('map')}>🗺️ Map</button>
          <button className={`${styles.viewToggleBtn} ${view === 'list' ? styles.viewToggleActive : ''}`} onClick={() => setView('list')}>📋 List</button>
        </div>
        {session?.user && (
          <Button variant="primary" className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            ➕ Create Board
          </Button>
        )}
      </div>

      {session?.user && (
        <div className={styles.locationCard}>
          <div className={styles.locationInfo}>
            <span className={styles.locationIcon}>🏠</span>
            <div>
              <div className={styles.locationLabel}>Your Location</div>
              <div className={styles.locationName}>
                {homeName || 'Not set — click the map to set your home base'}
              </div>
            </div>
          </div>
          <div className={styles.locationActions}>
            <Button
              variant="secondary"
              className={`${styles.locBtn} ${settingLocation ? styles.locBtnActive : ''}`}
              onClick={() => setSettingLocation(s => !s)}
            >
              {settingLocation ? '✕ Cancel' : '📍 Set on Map'}
            </Button>
            <Button variant="secondary" className={styles.locBtn} onClick={handleDetectLocation}>
              📡 Detect
            </Button>
            {homeCoords && (
              <Button variant="secondary" className={styles.locBtn} onClick={handleFlyHome}>
                ✈️ Fly Home
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={styles.searchBar}>
        <form onSubmit={handleSearch} className={styles.search}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search boards by name, city, or description..."
            className={styles.searchInput}
          />
          <Button type="submit" variant="primary" className={styles.searchBtn}>Search</Button>
          {searchQuery && (
            <Button type="button" variant="ghost" className={styles.clearBtn} onClick={() => { setSearchQuery(''); fetchBoards() }}>
              Clear
            </Button>
          )}
        </form>
        <div className={styles.searchControls}>
          <button className={`${styles.myBtn} ${myBoards ? styles.myBtnActive : ''}`} onClick={() => { setMyBoards(!myBoards); fetchBoards(undefined, undefined) }}>
            {myBoards ? '📌 All Boards' : '📌 My Boards'}
          </button>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as 'recent' | 'alpha')}
            className={styles.sortSelect}
          >
            <option value="recent">Most Recent</option>
            <option value="alpha">Alphabetical A-Z</option>
          </select>
        </div>
      </div>

      {(view === 'all' || view === 'map') && (
      <div className={styles.mapWrap}>
        {settingLocation && <div className={styles.mapOverlay}>Click anywhere on the map to set your home location</div>}
        <MapContainer center={mapCenter} zoom={12} className={styles.map} scrollWheelZoom={true}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController mapRef={mapRef} onReady={() => setMapReady(true)} />
          <MapEvents onMove={handleMapMove} />
          {settingLocation && <BoardMapClickHandler onClick={handleMapClickSetLocation} />}
          {homeCoords && (
            <Marker position={homeCoords} icon={getPassportIcon()}>
              <Tooltip>🏠 {homeName || 'Home'}</Tooltip>
              <Popup>
                <div style={{ textAlign: 'center', minWidth: 120 }}>
                  <strong>🏠 Your Location</strong>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{homeName || `${homeCoords[0].toFixed(4)}, ${homeCoords[1].toFixed(4)}`}</span>
                </div>
              </Popup>
            </Marker>
          )}
          {boards.filter(b => b.latitude && b.longitude).map(b => {
            const isHighlighted = b.id === hoveredBoardId || b.id === selectedBoardId
            const isOwner = b.ownerId === session?.user?.id
            return (
              <Marker
                key={b.id}
                position={[b.latitude!, b.longitude!]}
                icon={getBoardIcon(isHighlighted, isOwner)}
              >
                <Tooltip>{b.name} — {b.pinCount} pins{b.memberCount != null ? ` · 👥 ${b.memberCount}` : ''}</Tooltip>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <Link href={`/boards/${b.slug}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--accent-primary)' }}>
                      {b.name}
                    </Link>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{b.location} · {b.pinCount} pins</span>
                    {b.distance != null && <br />}
                    {b.distance != null && <span style={{ fontSize: '0.8rem' }}>📍 {b.distance} mi</span>}
                  </div>
                </Popup>
              </Marker>
            )
          })}
          {(() => {
            const noLocBoards = boards.filter(b => !b.latitude || !b.longitude)
            if (noLocBoards.length === 0) return null
            const locGroups = new Map<string, typeof noLocBoards>()
            noLocBoards.forEach(b => {
              const key = b.city || b.location || 'Unknown Area'
              if (!locGroups.has(key)) locGroups.set(key, [])
              locGroups.get(key)!.push(b)
            })
            return Array.from(locGroups.entries()).map(([area, group]) =>
              L ? (
                <Marker key={`no-loc-${area}`} position={mapCenter} icon={getBoardIcon(false)}>
                  <Tooltip>📍 {group.length} board{group.length !== 1 ? 's' : ''} in {area}</Tooltip>
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <strong>📍 {group.length} board{group.length !== 1 ? 's' : ''} in {area}</strong>
                      {group.slice(0, 10).map(b => (
                        <div key={b.id} style={{ marginTop: 4 }}>
                          <Link href={`/boards/${b.slug}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                            {b.name}
                          </Link>
                        </div>
                      ))}
                      {group.length > 10 && <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#666' }}>+{group.length - 10} more</div>}
                    </div>
                  </Popup>
                </Marker>
              ) : null
            )
          })()}
        </MapContainer>
      </div>
      )}

      {(view === 'all' || view === 'list') && (
      <div className={styles.grid}>
        {loading ? (
          <Loading size="medium" message="Loading boards..." />
        ) : boards.length === 0 ? (
          <EmptyState icon="📌" title="No boards found" description="No boards near your location. Create one or search for a city." action={session?.user ? { label: 'Create Board', onClick: () => setShowCreateModal(true) } : { label: 'Sign In', onClick: () => window.location.href = '/auth/login' }} />
        ) : (
          sortedBoards.map(board => (
            <div
              key={board.id}
              className={`${styles.card} ${board.id === selectedBoardId ? styles.cardSelected : ''}`}
              onMouseEnter={() => handleCardHover(board.id)}
              onMouseLeave={() => handleCardHover(null)}
              onClick={() => handleCardClick(board)}
            >
              <Link href={`/boards/${board.slug}`} className={styles.cardInner}>
                <div className={styles.cardHeader}>
                  <h3>{board.name}</h3>
                  {board.isSystem && <span className={styles.systemBadge}>Auto</span>}
                </div>
                {board.description && <p className={styles.cardDesc}>{board.description}</p>}
                <div className={styles.cardMeta}>
                  <span>📌 {board.pinCount} pins</span>
                  {board.memberCount != null && <span>👥 {board.memberCount}</span>}
                  {board.location && <span>📍 {board.location}</span>}
                  {board.distance != null && <span>📍 {board.distance} mi</span>}
                  {board.city && <span>🏙️ {board.city}</span>}
                </div>
                <span className={styles.visitBtn}>View Board →</span>
              </Link>
              {board.latitude && board.longitude && (
                <button className={styles.flyBtn} onClick={(e) => handleFlyToBoard(e, board)} title="Fly to on map">📍</button>
              )}
              {board.ownerId === session?.user?.id && (
                <div className={styles.cardOwnerActions}>
                  <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); openEdit(board) }} title="Edit">✏️</button>
                  <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); setDeleteBoardId(board.id) }} title="Delete">🗑️</button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { fetchBoards(); setShowCreateModal(false) }}
        />
      )}

      {editBoard && (
        <div className="modal-overlay" onClick={() => setEditBoard(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Board</h2>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Board Name *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="City, address, etc." />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Latitude</label>
                  <input type="number" step="any" value={editLatitude} onChange={e => setEditLatitude(e.target.value)} placeholder="40.7128" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Longitude</label>
                  <input type="number" step="any" value={editLongitude} onChange={e => setEditLongitude(e.target.value)} placeholder="-74.006" />
                </div>
              </div>
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => setEditBoard(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={editing}>
                  {editing ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteBoardId}
        onClose={() => setDeleteBoardId(null)}
        onConfirm={handleDelete}
        title="Delete Board"
        message="Are you sure? All pins will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
