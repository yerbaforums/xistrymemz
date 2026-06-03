'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

export function BoardMapClickHandler({ onClick }: { onClick: (e: any) => void }) {
  const map = useMap()

  useEffect(() => {
    map.on('click', onClick)
    return () => { map.off('click', onClick) }
  }, [map, onClick])

  return null
}
