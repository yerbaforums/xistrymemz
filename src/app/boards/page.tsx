'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import CreateBoardModal from '@/components/CreateBoardModal'
import styles from './page.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
const MapEvents = dynamic(() => import('./MapEvents').then(m => m.MapEvents), { ssr: false })

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
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006])
  const [mapZoom, setMapZoom] = useState(10)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [hoveredBoardId, setHoveredBoardId] = useState<string | null>(null)
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null)
  const mapRef = useRef<any>(null)

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
          setMapCenter([pos.coords.latitude, pos.coords.longitude])
        } catch {}
      }

      const res = await fetch(`/api/boards?${params}`)
      const data = await res.json()
      setBoards(data.boards || [])
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
        const locations: UserLocation[] = data?.user?.locations || data?.locations || []
        if (locations.length === 0) return
        for (const loc of locations) {
          if (!loc.latitude || !loc.longitude) continue
          const checkRes = await fetch(`/api/boards?lat=${loc.latitude}&lng=${loc.longitude}&radius=25&limit=1`)
          const checkData = await checkRes.json()
          if (!checkData.boards || checkData.boards.length === 0) {
            await fetch('/api/boards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: loc.name ? `${loc.name} Board` : `${loc.location} Board`,
                location: loc.location,
                latitude: loc.latitude,
                longitude: loc.longitude,
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
      setMapCenter([board.latitude, board.longitude])
      setMapZoom(14)
    }
  }

  const handleCardHover = (boardId: string | null) => {
    setHoveredBoardId(boardId)
  }

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
        <MapContainer center={mapCenter} zoom={mapZoom} className={styles.map} scrollWheelZoom={true} ref={mapRef}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onMove={handleMapMove} />
          {boards.filter(b => b.latitude && b.longitude).map(b => {
            const isHighlighted = b.id === hoveredBoardId || b.id === selectedBoardId
            return (
              <Marker
                key={b.id}
                position={[b.latitude!, b.longitude!]}
                icon={isHighlighted ? undefined : undefined}
                opacity={isHighlighted ? 1 : 0.7}
              >
                <Popup>
                  <Link href={`/boards/${b.slug}`} style={{ fontWeight: 600, textDecoration: 'none', color: 'var(--accent-primary)' }}>
                    {b.name}
                  </Link>
                  <br />
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>{b.location} · {b.pinCount} pins</span>
                  {b.distance != null && <br />}
                  {b.distance != null && <span style={{ fontSize: '0.8rem' }}>📍 {b.distance} mi</span>}
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
