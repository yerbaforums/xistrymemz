'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import BoardPinCard from '@/components/BoardPinCard'
import CreatePinModal from '@/components/CreatePinModal'
import Button from '@/components/ui/Button'
import PinCarouselModal from '@/components/PinCarouselModal'
import { EmptyState } from '@/components/EmptyState'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

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
  latitude: number | null
  longitude: number | null
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
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null)

  const pinLocations = pins.filter(p => p.latitude && p.longitude)

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

  const mapCenter: [number, number] = board.latitude && board.longitude
    ? [board.latitude, board.longitude]
    : pinLocations.length > 0
      ? [pinLocations[0].latitude!, pinLocations[0].longitude!]
      : [40.7128, -74.006]

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Boards', href: '/boards' },
        { label: board.name || 'Board' },
      ]} />
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
            <Button variant="primary" className={styles.pinBtn} onClick={() => setShowCreateModal(true)}>
              📌 Pin Something
            </Button>
          )}
        </div>
      </div>

      {pinLocations.length > 0 && (
        <div className={styles.mapWrap}>
          <MapContainer center={mapCenter} zoom={12} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {board.latitude && board.longitude && pinLocations.length === 0 && (
              <Marker position={[board.latitude, board.longitude]}>
                <Popup>{board.name} — {board.location || ''}</Popup>
              </Marker>
            )}
            {pinLocations.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <strong>{pin.title || pin.content?.slice(0, 60)}</strong>
                    {pin.entityType && pin.entityTitle && (
                      <div className={styles.popupMeta}>📎 {pin.entityTitle}</div>
                    )}
                    <div className={styles.popupDate}>
                      {pin.user.name} · {new Date(pin.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {pinLocations.length === 0 && board.latitude && board.longitude && (
        <div className={styles.mapWrap}>
          <MapContainer center={[board.latitude, board.longitude]} zoom={12} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[board.latitude, board.longitude]}>
              <Popup>{board.name} — {board.location || ''}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}

      {pins.length === 0 ? (
        <EmptyState icon="📌" title="No pins yet" description="Be the first to pin something to this board!" action={session?.user ? { label: 'Pin Something', onClick: () => setShowCreateModal(true) } : undefined} />
      ) : (
        <div className={styles.pinsGrid}>
          {pins.map(pin => (
            <BoardPinCard
              key={pin.id}
              pin={pin}
              isOwner={pin.userId === userId}
              isBoardOwner={isBoardOwner}
              onDelete={handleDelete}
              onView={(pinId) => {
                const idx = pins.findIndex(p => p.id === pinId)
                if (idx >= 0) setCarouselIndex(idx)
              }}
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

      {carouselIndex !== null && (
        <PinCarouselModal
          pins={pins}
          initialIndex={carouselIndex}
          onClose={() => setCarouselIndex(null)}
        />
      )}
    </div>
  )
}
