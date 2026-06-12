'use client'

import { useState, useEffect } from 'react'
import { usePassportLocation } from '@/hooks/usePassportLocation'

interface UserLocation {
  lat: number
  lng: number
  source: 'passport' | 'browser' | 'ip' | 'default'
}

export function useUserLocation(): UserLocation | null {
  const { location: passportLoc } = usePassportLocation()
  const [loc, setLoc] = useState<UserLocation | null>(null)

  useEffect(() => {
    // Priority 1: Passport location
    if (passportLoc?.latitude && passportLoc?.longitude) {
      setLoc({ lat: passportLoc.latitude, lng: passportLoc.longitude, source: 'passport' })
      return
    }
  }, [passportLoc])

  useEffect(() => {
    if (loc) return

    // Priority 2: Browser geolocation API
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'browser' })
        },
        () => {
          // Priority 3: IP-based geolocation (free, no API key)
          fetch('https://ipapi.co/json/')
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(data => {
              if (data?.latitude && data?.longitude) {
                setLoc({ lat: data.latitude, lng: data.longitude, source: 'ip' })
              }
            })
            .catch(() => {
              // Fallback: US center
              setLoc({ lat: 39.8283, lng: -98.5795, source: 'default' })
            })
        },
        { timeout: 3000, enableHighAccuracy: false }
      )
    } else {
      // No geolocation API - try IP
      fetch('https://ipapi.co/json/')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => {
          if (data?.latitude && data?.longitude) {
            setLoc({ lat: data.latitude, lng: data.longitude, source: 'ip' })
          }
        })
        .catch(() => {
          setLoc({ lat: 39.8283, lng: -98.5795, source: 'default' })
        })
    }
  }, [loc])

  return loc
}
