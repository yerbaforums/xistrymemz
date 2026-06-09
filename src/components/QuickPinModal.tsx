'use client'

import { useState, useEffect } from 'react'
import Loading from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import styles from './QuickPinModal.module.css'

interface NearbyBoard {
  id: string
  name: string
  slug: string
  location: string | null
  pinCount: number
  distance: number | null
}

interface QuickPinModalProps {
  entityType: string
  entityId: string
  entityTitle: string
  entityImage?: string
  entityLatitude?: number
  entityLongitude?: number
  onClose: () => void
  onPinned: () => void
}

const PIN_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'JOBS', label: 'Jobs' },
  { value: 'FREE', label: 'Free' },
]

const ASSET_ICONS: Record<string, string> = {
  PRODUCT: '🛒', SERVICE: '🔧', EVENT: '📅', GROUP: '👥',
  PLAN: '🚀', REQUEST: '📝', SCHOOL_CONTENT: '📚', POST: '✏️',
  SHOP: '🏪', USER: '👤',
}

export default function QuickPinModal({ entityType, entityId, entityTitle, entityImage, entityLatitude, entityLongitude, onClose, onPinned }: QuickPinModalProps) {
  const [boards, setBoards] = useState<NearbyBoard[]>([])
  const [loadingBoards, setLoadingBoards] = useState(true)
  const [selectedBoard, setSelectedBoard] = useState<NearbyBoard | null>(null)
  const [category, setCategory] = useState('PROMOTION')
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [creatingBoard, setCreatingBoard] = useState(false)

  useEffect(() => {
    const fetchBoards = async () => {
      setLoadingBoards(true)
      try {
        const params = new URLSearchParams()
        params.set('limit', '50')
        if (entityLatitude && entityLongitude) {
          params.set('lat', String(entityLatitude))
          params.set('lng', String(entityLongitude))
        } else if (typeof window !== 'undefined' && 'geolocation' in navigator) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 })
            )
            params.set('lat', String(pos.coords.latitude))
            params.set('lng', String(pos.coords.longitude))
          } catch {}
        }
        const res = await fetch(`/api/boards?${params}`)
        const data = await res.json()
        setBoards(data.boards || [])
        if (data.boards?.length > 0) setSelectedBoard(data.boards[0])
      } catch {}
      setLoadingBoards(false)
    }
    fetchBoards()
  }, [entityLatitude, entityLongitude])

  const filteredBoards = search
    ? boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.location?.toLowerCase().includes(search.toLowerCase()))
    : boards

  const handleSubmit = async () => {
    if (!selectedBoard) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/boards/${selectedBoard.slug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `${ASSET_ICONS[entityType] || '📌'} ${entityTitle}`,
          entityType,
          entityId,
          entityTitle,
          entityImage: entityImage || undefined,
          latitude: entityLatitude,
          longitude: entityLongitude,
          category,
        }),
      })
      if (res.ok) {
        onPinned()
        onClose()
      }
    } catch {}
    setSubmitting(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📌 Pin to Board</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewIcon}>{ASSET_ICONS[entityType] || '📌'}</div>
          <div className={styles.previewInfo}>
            <div className={styles.previewType}>{entityType}</div>
            <div className={styles.previewTitle}>{entityTitle}</div>
          </div>
          {entityImage && (
            <img src={entityImage} alt="" className={styles.previewImg} />
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
            {PIN_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Board</label>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search boards..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className={styles.boardList}>
            {loadingBoards ? (
              <Loading size="small" message="Loading..." />
            ) : filteredBoards.length === 0 ? (
              <EmptyState icon="📌" title="No boards found nearby" description="Create a new board to pin this item." action={{ label: 'Create Board', onClick: async () => { setCreatingBoard(true); try { const pos = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })); const res = await fetch('/api/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${entityTitle} Board`, location: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, latitude: pos.coords.latitude, longitude: pos.coords.longitude }) }); if (res.ok) { const data = await res.json(); const newBoard = { id: data.id, name: data.name, slug: data.slug, location: data.location, pinCount: 0, distance: null }; setBoards(prev => [newBoard, ...prev]); setSelectedBoard(newBoard); } } catch {} setCreatingBoard(false); } }} />
            ) : (
              filteredBoards.map(board => (
                <div
                  key={board.id}
                  className={`${styles.boardItem} ${selectedBoard?.id === board.id ? styles.boardItemSelected : ''}`}
                  onClick={() => setSelectedBoard(board)}
                >
                  <div className={styles.boardDot} />
                  <div className={styles.boardInfo}>
                    <div className={styles.boardName}>{board.name}</div>
                    <div className={styles.boardLocation}>
                      {board.location && <span>{board.location}</span>}
                      <span>📌 {board.pinCount} pins</span>
                      {board.distance != null && <span>📍 {board.distance} mi</span>}
                    </div>
                  </div>
                  {selectedBoard?.id === board.id && <span className={styles.checkmark}>✓</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!selectedBoard || submitting}
          >
            {submitting ? '⏳ Pinning...' : '📌 Pin It'}
          </button>
        </div>
      </div>
    </div>
  )
}
