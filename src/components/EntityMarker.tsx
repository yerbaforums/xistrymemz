'use client'

import dynamic from 'next/dynamic'
import { ENTITY_ICONS } from '@/lib/entity-icons'

const CustomMarker = dynamic(() =>
  import('react-leaflet').then(({ Marker }) =>
    import('leaflet').then(L => {
      function EntityMarkerInner({ type, position, size, highlighted, children, ...props }: any) {
        const info = ENTITY_ICONS[type?.toUpperCase()] || { emoji: '📍', color: '#6b7280' }
        const s = size || 28
        const glow = highlighted ? `inset 0 0 0 3px ${info.color},0 0 8px ${info.color}80` : '0 1px 4px rgba(0,0,0,0.3)'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${info.color};display:flex;align-items:center;justify-content:center;font-size:${s * 0.48}px;border:${highlighted ? '3px solid white' : '2px solid white'};box-shadow:${glow};">${info.emoji}</div>`,
          iconSize: [s + 4, s + 4],
          iconAnchor: [(s + 4) / 2, (s + 4) / 2],
          popupAnchor: [0, -(s + 4) / 2],
        })
        return <Marker position={position} icon={icon} {...props}>{children}</Marker>
      }
      return EntityMarkerInner
    })
  ),
  { ssr: false }
)

export default function CustomEntityMarker(props: any) {
  return <CustomMarker {...props} />
}
