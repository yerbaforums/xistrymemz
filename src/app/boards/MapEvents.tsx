'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import type { MutableRefObject } from 'react'

export function MapEvents({ onMove }: { onMove: (bounds: { north: number; south: number; east: number; west: number }) => void }) {
  const map = useMap()

  useEffect(() => {
    const handler = () => {
      const b = map.getBounds()
      onMove({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      })
    }
    map.on('moveend', handler)
    handler()
    return () => { map.off('moveend', handler) }
  }, [map, onMove])

  return null
}

export function MapController({ mapRef }: { mapRef: MutableRefObject<any> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}
