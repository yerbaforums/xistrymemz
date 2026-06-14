'use client'

import dynamic from 'next/dynamic'
import { getMapMarkerIcon } from '@/lib/map-markers'

const DynamicMarker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })

interface EntityMarkerProps {
  type: string
  position: [number, number]
  size?: number
  highlighted?: boolean
  leaflet?: any
  eventHandlers?: any
  children?: React.ReactNode
}

export default function EntityMarker({ type, position, size, highlighted, leaflet: L, eventHandlers, children }: EntityMarkerProps) {
  const icon = L ? getMapMarkerIcon(L, type, { size, highlighted }) : undefined

  return (
    <DynamicMarker position={position} icon={icon} eventHandlers={eventHandlers}>
      {children}
    </DynamicMarker>
  )
}
