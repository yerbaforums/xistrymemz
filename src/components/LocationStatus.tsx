'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface LocationData {
  location: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  searchRadius: number
  traveling: boolean
}

export default function LocationStatus() {
  const [loc, setLoc] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/users/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.user) {
          setLoc({
            location: data.user.location || null,
            neighborhood: data.user.neighborhood || null,
            latitude: data.user.latitude || null,
            longitude: data.user.longitude || null,
            searchRadius: data.user.searchRadius || 50,
            traveling: data.user.traveling || false
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !loc) return null

  const displayLocation = loc.location || loc.neighborhood || null
  if (!displayLocation) return null

  return (
    <Link
      href="/profile/edit"
      title={loc.traveling ? `Traveling — ${displayLocation}` : `Home — ${displayLocation}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        background: loc.traveling
          ? 'rgba(255, 193, 7, 0.15)'
          : 'rgba(0, 217, 255, 0.1)',
        border: loc.traveling
          ? '1px solid rgba(255, 193, 7, 0.3)'
          : '1px solid rgba(0, 217, 255, 0.2)',
        color: loc.traveling ? '#ffc107' : 'var(--accent-primary)'
      }}
    >
      {loc.traveling ? '✈️' : '📍'}
      <span>{displayLocation}</span>
      {loc.traveling && (
        <span style={{ opacity: 0.6, marginLeft: '2px' }}>traveling</span>
      )}
    </Link>
  )
}
