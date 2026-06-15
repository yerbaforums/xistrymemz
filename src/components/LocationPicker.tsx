'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import { geocodeLocation, reverseGeocodeLocation } from '@/lib/geocoding'
import styles from './LocationPicker.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const ClickHandler = dynamic(() => import('@/components/MapClickHandler'), { ssr: false })

type Tab = 'saved' | 'map' | 'custom' | 'global'

interface SavedLocation {
  id: string
  name: string
  location: string
  latitude: number | null
  longitude: number | null
  isPrimary: boolean
}

interface LocationPickerProps {
  value: { text: string; latitude: number | null; longitude: number | null }
  onChange: (value: { text: string; latitude: number | null; longitude: number | null }) => void
  label?: string
}

export default function LocationPicker({ value, onChange, label = 'Location' }: LocationPickerProps) {
  const { data: session } = useSession()
  const [tab, setTab] = useState<Tab>(value.latitude ? 'map' : 'saved')
  const [saved, setSaved] = useState<SavedLocation[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [customText, setCustomText] = useState(value.text)
  const [geocoding, setGeocoding] = useState(false)
  const [mapMarker, setMapMarker] = useState<[number, number] | null>(
    value.latitude && value.longitude ? [value.latitude, value.longitude] : null
  )
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    value.latitude && value.longitude ? [value.latitude, value.longitude] : [40.7128, -74.006]
  )
  const [detecting, setDetecting] = useState(false)
  const [settingLocation, setSettingLocation] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    let cancelled = false
    fetch('/api/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const u = data?.user || data
        const locs: SavedLocation[] = []
        if (u?.latitude && u?.longitude) {
          locs.push({
            id: 'primary',
            name: u.location || 'Home',
            location: u.location || `${u.latitude.toFixed(4)}, ${u.longitude.toFixed(4)}`,
            latitude: u.latitude,
            longitude: u.longitude,
            isPrimary: true,
          })
        }
        const extra: SavedLocation[] = u?.locations || data?.locations || []
        for (const loc of extra) {
          if (loc.latitude && loc.longitude) {
            locs.push({ ...loc, isPrimary: false })
          }
        }
        if (!cancelled) {
          setSaved(locs)
          setLoadingSaved(false)
        }
      })
      .catch(() => { if (!cancelled) setLoadingSaved(false) })
    return () => { cancelled = true }
  }, [session?.user?.id])

  const selectLocation = useCallback((text: string, lat: number | null, lng: number | null) => {
    onChange({ text, latitude: lat, longitude: lng })
  }, [onChange])

  const handleSavedPick = (loc: SavedLocation) => {
    if (!loc.latitude || !loc.longitude) return
    selectLocation(loc.location, loc.latitude, loc.longitude)
    setTab('map')
  }

  const handleCustomGeocode = async () => {
    if (!customText.trim()) return
    setGeocoding(true)
    try {
      const result = await geocodeLocation(customText)
      if (result) {
        selectLocation(result.displayName, result.latitude, result.longitude)
        setMapMarker([result.latitude, result.longitude])
        setMapCenter([result.latitude, result.longitude])
      }
    } catch {}
    setGeocoding(false)
  }

  const handleMapClick = async (lat: number, lng: number) => {
    setMapMarker([lat, lng])
    setMapCenter([lat, lng])
    try {
      const addr = await reverseGeocodeLocation(lat, lng)
      selectLocation(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng)
    } catch {
      selectLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng)
    }
  }

  const detectLocation = async () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return
    setDetecting(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      setMapMarker([lat, lng])
      setMapCenter([lat, lng])
      const addr = await reverseGeocodeLocation(lat, lng)
      selectLocation(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng)
    } catch {}
    setDetecting(false)
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>{label}</label>
      <div className={styles.tabs}>
        <button type="button" className={`${styles.tab} ${tab === 'saved' ? styles.tabActive : ''}`} onClick={() => setTab('saved')}>📍 Saved</button>
        <button type="button" className={`${styles.tab} ${tab === 'map' ? styles.tabActive : ''}`} onClick={() => setTab('map')}>🗺️ Map</button>
        <button type="button" className={`${styles.tab} ${tab === 'custom' ? styles.tabActive : ''}`} onClick={() => setTab('custom')}>✏️ Custom</button>
        <button type="button" className={`${styles.tab} ${tab === 'global' ? styles.tabActive : ''}`} onClick={() => { setTab('global'); selectLocation('', null, null) }}>🌍 Global</button>
      </div>

      <div className={styles.panel}>
        {tab === 'saved' && (
          <div className={styles.savedPanel}>
            {loadingSaved ? (
              <p className={styles.hint}>Loading locations...</p>
            ) : saved.length === 0 ? (
              <p className={styles.hint}>No saved locations. Set your passport location or use the Map tab.</p>
            ) : (
              <div className={styles.chipGroup}>
                {saved.map(loc => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => handleSavedPick(loc)}
                    className={`${styles.chip} ${value.text === loc.location ? styles.chipActive : ''}`}
                  >
                    <span className={styles.chipIcon}>{loc.isPrimary ? '🏠' : '📍'}</span>
                    <span className={styles.chipName}>{loc.name}</span>
                    <span className={styles.chipLoc}>{loc.location}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'map' && (
          <div className={styles.mapPanel}>
            <button type="button" onClick={detectLocation} disabled={detecting} className={styles.detectBtn}>
              {detecting ? '📍 Detecting...' : '📍 Use My Current Location'}
            </button>
            <button type="button" onClick={() => setSettingLocation(s => !s)} className={styles.mapToggleBtn}>
              {settingLocation ? '✕ Cancel' : '🗺️ Click on Map'}
            </button>
            {settingLocation && (
              <p className={styles.mapHint}>Click the map to place a pin</p>
            )}
            <div className={styles.mapWrap}>
              <MapContainer center={mapCenter} zoom={mapMarker ? 12 : 2} className={styles.map} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <ClickHandler onClick={handleMapClick} />
                {mapMarker && <Marker position={mapMarker} />}
              </MapContainer>
            </div>
            {mapMarker && (
              <p className={styles.coords}>
                {value.text || `${mapMarker[0].toFixed(4)}, ${mapMarker[1].toFixed(4)}`}
              </p>
            )}
          </div>
        )}

        {tab === 'custom' && (
          <div className={styles.customPanel}>
            <div className={styles.customRow}>
              <input
                type="text"
                value={customText}
                onChange={e => { setCustomText(e.target.value); selectLocation(e.target.value, value.latitude, value.longitude) }}
                placeholder="City, address, or venue name"
                className={styles.customInput}
              />
              <button type="button" onClick={handleCustomGeocode} disabled={geocoding || !customText.trim()} className={styles.geocodeBtn}>
                {geocoding ? '...' : '🔍 Geocode'}
              </button>
            </div>
          </div>
        )}

        {tab === 'global' && (
          <p className={styles.hint}>Available everywhere — no specific location.</p>
        )}

        {value.text && tab !== 'global' && (
          <div className={styles.selected}>
            <span className={styles.selectedLabel}>Selected:</span>
            <span className={styles.selectedText}>{value.text}</span>
            {value.latitude && value.longitude && (
              <span className={styles.selectedCoords}>({value.latitude.toFixed(4)}, {value.longitude.toFixed(4)})</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
