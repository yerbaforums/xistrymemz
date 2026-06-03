'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './PinToBoardButton.module.css'

interface PinToBoardButtonProps {
  entityType: string
  entityId: string
  entityTitle: string
  entityImage?: string
  entityLatitude?: number
  entityLongitude?: number
  variant?: 'primary' | 'secondary' | 'ghost'
  label?: string
}

export default function PinToBoardButton({ entityType, entityId, entityTitle, entityImage, entityLatitude, entityLongitude, variant = 'secondary', label }: PinToBoardButtonProps) {
  const [loading, setLoading] = useState(false)
  const { success, error } = useToast()

  const handlePin = async () => {
    setLoading(true)
    try {
      const geoRes = await fetch('/api/boards?limit=1')
      const geoData = await geoRes.json()
      let boardSlug: string | null = null

      if (geoData.boards && geoData.boards.length > 0) {
        boardSlug = geoData.boards[0].slug
      } else if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          )
          const createRes = await fetch('/api/boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Quick Pin Board',
              location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          })
          if (createRes.ok) {
            const newBoard = await createRes.json()
            boardSlug = newBoard.slug
          }
        } catch {}
      }

      if (!boardSlug) {
        error('No nearby board found. Create one first.')
        return
      }

      const res = await fetch(`/api/boards/${boardSlug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📌 Pinned ${entityType.toLowerCase()}: ${entityTitle}`,
          entityType,
          entityId,
          entityTitle,
          entityImage: entityImage || undefined,
          latitude: entityLatitude,
          longitude: entityLongitude,
          category: 'PROMOTION',
        }),
      })

      if (res.ok) {
        success(`Pinned to board!`)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to pin')
      }
    } catch {
      error('Failed to pin to board')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`${styles.btn} ${styles[variant]}`}
      onClick={handlePin}
      disabled={loading}
      title="Pin to community bulletin board"
    >
      {loading ? '⏳' : '📌'} {label || 'Pin to Board'}
    </button>
  )
}
