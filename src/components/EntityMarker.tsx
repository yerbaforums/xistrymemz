'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { getMapMarkerIcon } from '@/lib/map-markers'

const DynamicMarker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })

interface EntityMarkerProps {
  type: string
  position: [number, number]
  size?: number
  highlighted?: boolean
  eventHandlers?: any
  children?: React.ReactNode
}

export default function EntityMarker({ type, position, size, highlighted, eventHandlers, children }: EntityMarkerProps) {
  const [icon, setIcon] = useState<any>(undefined)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    import('leaflet').then(L => {
      setIcon(getMapMarkerIcon(L, type, { size, highlighted }))
    }).catch(() => {})
  }, [type, size, highlighted])

  return (
    <DynamicMarker position={position} icon={icon} eventHandlers={eventHandlers}>
      {children}
    </DynamicMarker>
  )
}
