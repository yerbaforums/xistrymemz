'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import styles from '../../dashboard/planning/planning.module.css'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), { ssr: false })

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
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard/planning" style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>← Back to Planning</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{trip.title}</h1>
      {trip.description && <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{trip.description}</p>}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        {trip.startDate && <span>📅 {new Date(trip.startDate).toLocaleDateString()}{trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ''}</span>}
        <span>📍 {trip.stops?.length || 0} stops</span>
        {trip.user && <span>👤 by {trip.user.name || 'Unknown'}</span>}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Itinerary</h2>
          {days.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No stops yet.</p>
          ) : days.map(day => (
            <div key={day} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.5rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.25rem' }}>
                Day {day + 1}
                {trip.startDate && <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                  {new Date(new Date(trip.startDate).getTime() + day * 86400000).toLocaleDateString()}
                </span>}
              </h3>
              {orderedStops(day).map(stop => (
                <div key={stop.id} style={{
                  display: 'flex', gap: '0.75rem', padding: '0.75rem',
                  borderLeft: '2px solid var(--accent-primary)', marginLeft: '0.5rem', marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'var(--accent-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                  }}>{stop.order + 1}</div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{stop.name}</div>
                    {stop.location && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{stop.location}</div>}
                    {stop.arrivalTime && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🕐 {stop.arrivalTime}{stop.departureTime ? ` - ${stop.departureTime}` : ''}</div>}
                    {stop.notes && <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>{stop.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {mapReady && (
          <div style={{ width: '400px', minWidth: '300px', height: '500px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
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
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href={`/dashboard/planning`} className={`${styles.btn} ${styles.btnPrimary}`} style={{ textDecoration: 'none' }}>
            View in Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}
