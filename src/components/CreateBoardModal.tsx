'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import styles from './CreateBoardModal.module.css'

const BoardMapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const BoardTileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const BoardMarker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const BoardClickHandler = dynamic(() => import('./BoardMapClickHandler').then(m => m.BoardMapClickHandler), { ssr: false })

interface CreateBoardModalProps {
  onClose: () => void
  onCreated: () => void
  initialCity?: string
  initialLat?: number
  initialLng?: number
}

interface SavedLocation {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
}

type Mode = 'map' | 'passport' | 'manual'

export default function CreateBoardModal({ onClose, onCreated, initialCity, initialLat, initialLng }: CreateBoardModalProps) {
  const [mode, setMode] = useState<Mode>(initialLat ? 'map' : 'passport')
  const [name, setName] = useState(initialCity ? `${initialCity} Board` : '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(initialCity || '')
  const [latitude, setLatitude] = useState(initialLat?.toString() || '')
  const [longitude, setLongitude] = useState(initialLng?.toString() || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [mapCenter, setMapCenter] = useState<[number, number]>([initialLat || 40.7128, initialLng || -74.006])
  const [mapMarker, setMapMarker] = useState<[number, number] | null>(initialLat && initialLng ? [initialLat, initialLng] : null)
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) return
        const data = await res.json()
        const user = data?.user
        const locs: SavedLocation[] = []

        if (user?.latitude && user?.longitude) {
          locs.push({
            id: 'primary',
            name: user.location || 'Home',
            location: user.location || `${user.latitude.toFixed(4)}, ${user.longitude.toFixed(4)}`,
            latitude: user.latitude,
            longitude: user.longitude,
            isPrimary: true,
          })
        }

        const saved: SavedLocation[] = user?.locations || data?.locations || []
        for (const loc of saved) {
          if (loc.latitude && loc.longitude) {
            locs.push({ ...loc, isPrimary: false })
          }
        }

        setSavedLocations(locs)

        if (locs.length > 0 && !initialLat) {
          const first = locs[0]
          setMapCenter([first.latitude!, first.longitude!])
          setMapMarker([first.latitude!, first.longitude!])
          setName(first.isPrimary ? `${first.name} Board` : `${first.name} Board`)
          setLocation(first.location)
          setLatitude(first.latitude!.toString())
          setLongitude(first.longitude!.toString())
        }
      } catch {}
      setLoadingLocations(false)
    }
    fetchLocations()
  }, [initialLat])

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng
    setMapMarker([lat, lng])
    setLatitude(lat.toFixed(6))
    setLongitude(lng.toFixed(6))
    setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    if (!name) setName('Local Board')
  }

  const handleSelectLocation = (loc: SavedLocation) => {
    if (!loc.latitude || !loc.longitude) return
    setMapCenter([loc.latitude, loc.longitude])
    setMapMarker([loc.latitude, loc.longitude])
    setName(loc.isPrimary ? `${loc.name} Board` : `${loc.name} Board`)
    setLocation(loc.location)
    setLatitude(loc.latitude.toString())
    setLongitude(loc.longitude.toString())
    setMode('manual')
  }

  const detectCurrentLocation = async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setError('Geolocation not available')
      return
    }
    setDetectingLocation(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      setMapCenter([lat, lng])
      setMapMarker([lat, lng])
      setLatitude(lat.toFixed(6))
      setLongitude(lng.toFixed(6))
      setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      if (!name) setName('Local Board')
    } catch {
      setError('Could not detect location. Try selecting on the map or using a saved location.')
    }
    setDetectingLocation(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) {
      setError('Name and location are required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim(),
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📌 Create a Bulletin Board</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modeTabs}>
          <button className={`${styles.modeTab} ${mode === 'map' ? styles.modeTabActive : ''}`} onClick={() => setMode('map')}>🗺️ Map</button>
          <button className={`${styles.modeTab} ${mode === 'passport' ? styles.modeTabActive : ''}`} onClick={() => setMode('passport')}>📍 My Locations</button>
          <button className={`${styles.modeTab} ${mode === 'manual' ? styles.modeTabActive : ''}`} onClick={() => setMode('manual')}>✏️ Manual</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          {mode === 'map' && (
            <div className={styles.mapSection}>
              <p className={styles.mapHint}>Click on the map to set the board location, or use the detect button.</p>
              <button type="button" className={styles.detectBtn} onClick={detectCurrentLocation} disabled={detectingLocation}>
                {detectingLocation ? '📍 Detecting...' : '📍 Use My Current Location'}
              </button>
              <div className={styles.mapWrap}>
                <BoardMapContainer center={mapCenter} zoom={12} className={styles.map} scrollWheelZoom={true}>
                  <BoardTileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <BoardClickHandler onClick={handleMapClick} />
                  {mapMarker && <BoardMarker position={mapMarker} />}
                </BoardMapContainer>
              </div>
              {mapMarker && (
                <p className={styles.mapCoords}>
                  Selected: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                </p>
              )}
            </div>
          )}

          {mode === 'passport' && (
            <div className={styles.passportSection}>
              <p className={styles.mapHint}>Choose a location from your Earth Passport or saved locations.</p>
              {loadingLocations ? (
                <p className={styles.loadingText}>Loading your locations...</p>
              ) : savedLocations.length === 0 ? (
                <div className={styles.emptyLocations}>
                  <p>No saved locations found.</p>
                  <p className={styles.mapHint}>Add locations in your <a href="/dashboard/passport" className={styles.inlineLink}>Passport</a>, or use the Map tab to pick one.</p>
                </div>
              ) : (
                <div className={styles.locationList}>
                  {savedLocations.map(loc => (
                    <button
                      key={loc.id}
                      type="button"
                      className={`${styles.locationItem} ${loc.latitude?.toString() === latitude ? styles.locationItemActive : ''}`}
                      onClick={() => handleSelectLocation(loc)}
                    >
                      <span className={styles.locationIcon}>{loc.isPrimary ? '🏠' : '📍'}</span>
                      <div className={styles.locationInfo}>
                        <span className={styles.locationName}>{loc.name}</span>
                        <span className={styles.locationAddr}>{loc.location}</span>
                      </div>
                      {loc.latitude?.toString() === latitude && <span className={styles.locationCheck}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className={styles.label}>
            Board Name *
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="Downtown Springfield Board"
              required
            />
          </label>

          <label className={styles.label}>
            Location *
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className={styles.input}
              placeholder="Springfield, IL"
              required
            />
          </label>

          <div className={styles.row}>
            <label className={styles.label}>
              Latitude
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className={styles.input}
                placeholder="40.7128"
              />
            </label>
            <label className={styles.label}>
              Longitude
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className={styles.input}
                placeholder="-74.006"
              />
            </label>
          </div>

          <label className={styles.label}>
            Description (optional)
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="What is this board about?"
              rows={3}
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Creating...' : '📌 Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
