'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import BoardPinCard from '@/components/BoardPinCard'
import CreatePinModal from '@/components/CreatePinModal'
import styles from './page.module.css'

interface PinUser {
  id: string
  name: string | null
  image: string | null
}

interface Pin {
  id: string
  title: string | null
  content: string | null
  images: string | null
  entityType: string | null
  entityId: string | null
  entityTitle: string | null
  entityImage: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  category: string | null
  expiresAt: string | null
  isPinned: boolean
  pinOrder: number
  userId: string
  user: PinUser
  createdAt: string
}

interface Board {
  id: string
  name: string
  slug: string
  description: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  city: string | null
  pinCount: number
  isSystem: boolean
  ownerId: string | null
  createdAt: string
}

export default function BoardDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const slug = params.slug as string

  const [board, setBoard] = useState<Board | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boards/${slug}?limit=50`)
      const data = await res.json()
      setBoard(data.board)
      setPins(data.pins || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }, [slug])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  const handleDelete = async (pinId: string) => {
    if (!confirm('Delete this pin?')) return
    try {
      const res = await fetch(`/api/boards/${slug}/pins/${pinId}`, { method: 'DELETE' })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pinId))
        setTotal(prev => prev - 1)
      }
    } catch {}
  }

  const userId = session?.user?.id
  const isBoardOwner = board ? board.ownerId === userId : false

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading board...</p>
      </div>
    )
  }

  if (!board) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <h2>Board not found</h2>
          <p>This board doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link href="/boards" className={styles.backLink}>← Back to Boards</Link>
      <div className={styles.boardHeader}>
        <div className={styles.boardInfo}>
          <h1>📌 {board.name}</h1>
          {board.description && <p className={styles.boardDesc}>{board.description}</p>}
          <div className={styles.boardMeta}>
            <span>📍 {board.location || board.city || 'Unknown location'}</span>
            <span>📌 {total} pins</span>
            {board.isSystem && <span className={styles.systemBadge}>Auto-created</span>}
          </div>
        </div>
        <div className={styles.boardActions}>
          {session?.user && (
            <button className={styles.pinBtn} onClick={() => setShowCreateModal(true)}>
              📌 Pin Something
            </button>
          )}
        </div>
      </div>

      {pins.length === 0 ? (
        <div className={styles.empty}>
          <p>No pins on this board yet.</p>
          {session?.user && (
            <button className={styles.pinBtn} onClick={() => setShowCreateModal(true)}>
              📌 Be the first to pin something
            </button>
          )}
        </div>
      ) : (
        <div className={styles.pinsGrid}>
          {pins.map(pin => (
            <BoardPinCard
              key={pin.id}
              pin={pin}
              isOwner={pin.userId === userId}
              isBoardOwner={isBoardOwner}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePinModal
          boardSlug={slug}
          boardName={board.name}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchBoard}
        />
      )}
    </div>
  )
}
