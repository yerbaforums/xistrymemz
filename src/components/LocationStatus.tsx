'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import { shortenLocation } from '@/lib/geocoding'

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
  const { error: toastError } = useToast()

  const fetchLoc = useCallback(async () => {
    try {
      const res = await fetch('/api/users/me', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
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
    } catch { toastError('Failed to load location') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchLoc()
    const interval = setInterval(fetchLoc, 5000)
    const onFocus = () => fetchLoc()
    const onTravel = () => fetchLoc()
    window.addEventListener('focus', onFocus)
    window.addEventListener('traveling-changed', onTravel)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); window.removeEventListener('traveling-changed', onTravel) }
  }, [fetchLoc])

  if (loading) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-tertiary)',
          minWidth: '60px',
          height: '26px',
        }}
      >
        <span style={{ opacity: 0.5 }}>---</span>
      </span>
    )
  }

  if (!loc) return null

  const rawLocation = loc.location || loc.neighborhood || null
  const displayLocation = rawLocation ? shortenLocation(rawLocation) : null
  if (!displayLocation) return null

  return (
    <Link
      href="/dashboard/passport"
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
