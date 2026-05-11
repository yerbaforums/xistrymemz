'use client'

import { useState, useEffect } from 'react'

export interface PassportLocation {
  location: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  searchRadius: number
  traveling: boolean
}

export function usePassportLocation() {
  const [loc, setLoc] = useState<PassportLocation | null>(null)
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

  return { location: loc, loading }
}
