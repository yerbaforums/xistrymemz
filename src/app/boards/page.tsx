'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './page.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

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

export default function BoardsPage() {
  const { data: session } = useSession()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [searchCity, setSearchCity] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006])

  const fetchBoards = useCallback(async (city?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (city) params.set('city', city)

      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBoards(searchCity.trim())
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1>📌 Community Bulletin Boards</h1>
        <p>Pin your cards, announcements, and listings to local boards</p>
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
        <MapContainer center={mapCenter} zoom={10} className={styles.map} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {boards.filter(b => b.latitude && b.longitude).map(b => (
            <Marker key={b.id} position={[b.latitude!, b.longitude!]}>
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
          ))}
        </MapContainer>
      </div>

      <div className={styles.grid}>
        {loading ? (
          <p className={styles.loading}>Loading boards...</p>
        ) : boards.length === 0 ? (
          <div className={styles.empty}>
            <p>No boards found near your location.</p>
            <p>Create one or search for a city.</p>
          </div>
        ) : (
          boards.map(board => (
            <Link key={board.id} href={`/boards/${board.slug}`} className={styles.card}>
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
          ))
        )}
      </div>
    </div>
  )
}
