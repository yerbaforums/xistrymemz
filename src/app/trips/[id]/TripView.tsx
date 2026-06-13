'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import styles from './TripView.module.css'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from '@/components/LeafletComponents'


interface TripStop {
  id: string; name: string; location: string | null
  latitude: number | null; longitude: number | null
  day: number; order: number; notes: string | null
  arrivalTime: string | null; departureTime: string | null
}

interface Trip {
  id: string; title: string; description: string | null
  startDate: string | null; endDate: string | null; isPublic: boolean
  user: { id: string; name: string | null; image: string | null } | null
  stops: TripStop[]
}

export default function TripView({ trip, sessionUserId }: { trip: Trip; sessionUserId?: string }) {
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (typeof document !== 'undefined') {
        import('leaflet').then(mod => {
          delete (mod.Icon.Default.prototype as any)._getIconUrl
          mod.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          })
        })
      }
      setTimeout(() => setMapReady(true), 200)
    }
  }, [])

  const days = trip.stops?.length
    ? [...new Set(trip.stops.map(s => s.day))].sort((a, b) => a - b)
    : []

  const orderedStops = (day: number) =>
    (trip.stops || []).filter(s => s.day === day).sort((a, b) => a.order - b.order)

  const coords = trip.stops?.filter(s => s.latitude && s.longitude).map(s => [s.latitude!, s.longitude!] as [number, number]) || []

  return (
    <div className={styles.page}>
      <div className={styles.backLink}>
        <Link href="/dashboard/planning">← Back to Planning</Link>
      </div>

      <h1 className={styles.title}>{trip.title}</h1>
      {trip.description && <p className={styles.description}>{trip.description}</p>}
      <div className={styles.metaRow}>
        {trip.startDate && <span>📅 {new Date(trip.startDate).toLocaleDateString()}{trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ''}</span>}
        <span>📍 {trip.stops?.length || 0} stops</span>
        {trip.user && <span>👤 by {trip.user.name || 'Unknown'}</span>}
      </div>

      <div className={styles.content}>
        <div className={styles.itinerary}>
          <h2>Itinerary</h2>
          {days.length === 0 ? (
            <p className={styles.textMuted}>No stops yet.</p>
          ) : days.map(day => (
            <div key={day} className={styles.daySection}>
              <h3 className={styles.dayHeading}>
                Day {day + 1}
                {trip.startDate && <span className={styles.dayDate}>
                  {new Date(new Date(trip.startDate).getTime() + day * 86400000).toLocaleDateString()}
                </span>}
              </h3>
              {orderedStops(day).map(stop => (
                <div key={stop.id} className={styles.stopCard}>
                  <div className={styles.stopNumber}>{stop.order + 1}</div>
                  <div>
                    <div className={styles.stopName}>{stop.name}</div>
                    {stop.location && <div className={styles.stopLocation}>{stop.location}</div>}
                    {stop.arrivalTime && <div className={styles.stopTime}>🕐 {stop.arrivalTime}{stop.departureTime ? ` - ${stop.departureTime}` : ''}</div>}
                    {stop.notes && <div className={styles.stopNotes}>{stop.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {mapReady && (
          <div className={styles.mapContainer}>
            <MapContainer center={coords.length > 0 ? [coords[0][0], coords[0][1]] : [20, 0]} zoom={coords.length > 0 ? 5 : 2} style={{ width: '100%', height: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {trip.stops?.filter(s => s.latitude && s.longitude).map(s => (
                <Marker key={s.id} position={[s.latitude!, s.longitude!]}>
                  <Popup>
                    <strong>{s.name}</strong>
                    {s.location && <br />}{s.location}
                  </Popup>
                </Marker>
              ))}
              {coords.length > 1 && <Polyline positions={coords} color="#3b82f6" weight={3} opacity={0.6} />}
            </MapContainer>
          </div>
        )}
      </div>

      {sessionUserId && sessionUserId !== trip.user?.id && (
        <div className={styles.footer}>
          <Link href={`/dashboard/planning`} className={styles.noUnderline}>
            View in Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}
