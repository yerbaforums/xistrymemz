'use client'

import { useMapEvents } from 'react-leaflet'

interface Props {
  onClick: (lat: number, lng: number) => void
}

export default function MapClickHandler({ onClick }: Props) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}
