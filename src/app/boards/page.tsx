'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import CreateBoardModal from '@/components/CreateBoardModal'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import { useToast } from '@/context/ToastContext'
import { reverseGeocodeLocation, shortenLocation } from '@/lib/geocoding'
import styles from './page.module.css'

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
  isSystem: boolean
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
  const [searchCity, setSearchCity] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const [settingLocation, setSettingLocation] = useState(false)
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null)
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

  const getBoardIcon = useCallback((highlighted: boolean) => {
    if (!L) return undefined
    return L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${highlighted ? 'var(--accent-primary)' : '#888'};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
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
        } catch {}
      }

      const res = await fetch(`/api/boards?${params}`)
      const data = await res.json()
      setBoards(data.boards || [])

      const locBoards = (data.boards || []).filter((b: Board) => b.latitude && b.longitude)
      if (locBoards.length > 0 && mapRef.current) {
        const bounds = locBoards.map((b: Board) => [b.latitude, b.longitude] as [number, number])
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      }
    } catch {}
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
      } catch {}
    }
    autoCreateFromLocations()
  }, [session, fetchBoards])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBoards(undefined, searchCity.trim())
  }

  const handleMapMove = useCallback((bounds: { north: number; south: number; east: number; west: number }) => {
    if (!searchCity) {
      fetchBoards(bounds)
    }
  }, [fetchBoards, searchCity])

  const handleCardClick = (board: Board) => {
    if (board.latitude && board.longitude) {
      setSelectedBoardId(board.id)
      if (mapRef.current) {
        mapRef.current.flyTo([board.latitude, board.longitude], 14, { duration: 1 })
      }
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

  const handleFlyHome = useCallback(() => {
    if (homeCoords && mapRef.current) {
      mapRef.current.flyTo(homeCoords, 12, { duration: 1 })
    }
  }, [homeCoords])

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>📌 Community Bulletin Boards</h1>
        <p>Pin your cards, announcements, and listings to local boards</p>
        {session?.user && (
          <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
            ➕ Create Board
          </button>
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
            <button
              className={`${styles.locBtn} ${settingLocation ? styles.locBtnActive : ''}`}
              onClick={() => setSettingLocation(s => !s)}
            >
              {settingLocation ? '✕ Cancel' : '📍 Set on Map'}
            </button>
            <button className={styles.locBtn} onClick={handleDetectLocation}>
              📡 Detect
            </button>
            {homeCoords && (
              <button className={styles.locBtn} onClick={handleFlyHome}>
                ✈️ Fly Home
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSearch} className={styles.search}>
        <input
          type="text"
          value={searchCity}
          onChange={e => setSearchCity(e.target.value)}
          placeholder="Search boards by city..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchBtn}>Search</button>
        {searchCity && (
          <button type="button" className={styles.clearBtn} onClick={() => { setSearchCity(''); fetchBoards() }}>
            Clear
          </button>
        )}
      </form>

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
            return (
              <Marker
                key={b.id}
                position={[b.latitude!, b.longitude!]}
                icon={getBoardIcon(isHighlighted)}
              >
                <Tooltip>{b.name} — {b.pinCount} pins</Tooltip>
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
        </MapContainer>
      </div>

      <div className={styles.grid}>
        {loading ? (
          <p className={styles.loading}>Loading boards...</p>
        ) : boards.length === 0 ? (
          <div className={styles.empty}>
            <p>No boards found near your location.</p>
            {session?.user ? (
              <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                ➕ Create the First Board
              </button>
            ) : (
              <p>Sign in to create one or search for a city.</p>
            )}
          </div>
        ) : (
          boards.map(board => (
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
                  {board.location && <span>📍 {board.location}</span>}
                  {board.distance != null && <span>📍 {board.distance} mi</span>}
                  {board.city && <span>🏙️ {board.city}</span>}
                </div>
                <span className={styles.visitBtn}>View Board →</span>
              </Link>
            </div>
          ))
        )}
      </div>

      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { fetchBoards(); setShowCreateModal(false) }}
        />
      )}
    </div>
  )
}
