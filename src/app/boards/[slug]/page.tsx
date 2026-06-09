'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import BoardPinCard from '@/components/BoardPinCard'
import CreatePinModal from '@/components/CreatePinModal'
import Button from '@/components/ui/Button'
import PinCarouselModal from '@/components/PinCarouselModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'
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
  latitude?: number | null
  longitude?: number | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  category: string | null
  expiresAt: string | null
  isPinned: boolean
  pinOrder?: number
  userId: string
  user: PinUser
  createdAt: string
  eventDate?: string | null
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
  const { success, error: toastError } = useToast()
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [board, setBoard] = useState<Board | null>(null)
  const [pins, setPins] = useState<Pin[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [editing, setEditing] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState<number | null>(null)
  const mapRef = useRef<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'map' | 'calendar'>('grid')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [editingPin, setEditingPin] = useState<Pin | null>(null)
  const [editPinTitle, setEditPinTitle] = useState('')
  const [joined, setJoined] = useState(false)
  const [memberCount, setMemberCount] = useState(0)
  const [joining, setJoining] = useState(false)
  const [editPinContent, setEditPinContent] = useState('')
  const [editPinCategory, setEditPinCategory] = useState('GENERAL')
  const [editPinContactName, setEditPinContactName] = useState('')
  const [editPinContactEmail, setEditPinContactEmail] = useState('')
  const [editPinContactPhone, setEditPinContactPhone] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  const pinLocations = pins.filter(p => p.latitude && p.longitude)

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/boards/${slug}?limit=50`)
      const data = await res.json()
      setBoard(data.board)
      setPins(data.pins || [])
      setTotal(data.total || 0)
    } catch (e) { console.error('Fetch board error:', e); toastError('Failed to load board') }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    fetchBoard()
  }, [fetchBoard])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/boards/${slug}/join`)
      .then(r => r.json())
      .then(data => {
        setJoined(data.joined)
        setMemberCount(data.memberCount)
      })
      .catch(() => {})
  }, [slug, session])

  const handleJoin = async () => {
    if (joining) return
    setJoining(true)
    try {
      const res = await fetch(`/api/boards/${slug}/join`, { method: 'POST' })
      const data = await res.json()
      setJoined(data.joined)
      setMemberCount(data.memberCount)
    } catch {} finally { setJoining(false) }
  }

  const handlePinFlyTo = (pin: Pin) => {
    if (pin.latitude && pin.longitude && mapRef.current) {
      mapRef.current.flyTo([pin.latitude, pin.longitude], 16, { duration: 0.8 })
    }
  }

  const handleDelete = async (pinId: string) => {
    if (!confirm('Delete this pin?')) return
    try {
      const res = await fetch(`/api/boards/${slug}/pins/${pinId}`, { method: 'DELETE' })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== pinId))
        setTotal(prev => prev - 1)
      }
    } catch (e) { console.error('Delete pin error:', e); toastError('Failed to delete pin') }
  }

  const handleEditPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPin) return
    setSavingPin(true)
    try {
      const res = await fetch(`/api/boards/${slug}/pins/${editingPin.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editPinTitle.trim(),
          content: editPinContent.trim(),
          category: editPinCategory,
          contactName: editPinContactName.trim() || null,
          contactEmail: editPinContactEmail.trim() || null,
          contactPhone: editPinContactPhone.trim() || null,
        }),
      })
      if (res.ok) {
        setEditingPin(null)
        await fetchBoard()
      }
    } catch {} finally { setSavingPin(false) }
  }

  const openEditPin = (pinId: string) => {
    const pin = pins.find(p => p.id === pinId)
    if (!pin) return
    setEditPinTitle(pin.title || '')
    setEditPinContent(pin.content || '')
    setEditPinCategory(pin.category || 'GENERAL')
    setEditPinContactName(pin.contactName || '')
    setEditPinContactEmail(pin.contactEmail || '')
    setEditPinContactPhone(pin.contactPhone || '')
    setEditingPin(pin)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!board || !editName.trim()) return
    setEditing(true)
    try {
      const res = await fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: board.id,
          name: editName.trim(),
          description: editDescription.trim() || null,
          location: editLocation.trim() || null,
          latitude: editLatitude ? parseFloat(editLatitude) : null,
          longitude: editLongitude ? parseFloat(editLongitude) : null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        setBoard(prev => prev ? { ...prev, ...updated } : null)
        setShowEditModal(false)
        success('Board updated!')
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to update')
      }
    } catch { toastError('Failed to update board') }
    finally { setEditing(false) }
  }

  const handleDeleteBoard = async () => {
    if (!board) return
    try {
      const res = await fetch(`/api/boards?id=${board.id}`, { method: 'DELETE' })
      if (res.ok) {
        setShowDeleteConfirm(false)
        success('Board deleted!')
        router.push('/boards')
      } else {
        const err = await res.json()
        toastError(err.error || 'Failed to delete')
      }
    } catch { toastError('Failed to delete board') }
  }

  const openEdit = () => {
    if (!board) return
    setEditName(board.name)
    setEditDescription(board.description || '')
    setEditLocation(board.location || '')
    setEditLatitude(board.latitude?.toString() || '')
    setEditLongitude(board.longitude?.toString() || '')
    setShowEditModal(true)
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
          {session?.user && board.ownerId !== userId && (
            <Button
              variant={joined ? 'secondary' : 'primary'}
              onClick={handleJoin}
              disabled={joining}
            >
              {joined ? '✓ Joined' : '+ Join Board'}
            </Button>
          )}
          {memberCount > 0 && <span className={styles.memberCount}>👥 {memberCount}</span>}
          {session?.user && (
            <Button variant="primary" className={styles.pinBtn} onClick={() => setShowCreateModal(true)}>
              📌 Pin Something
            </Button>
          )}
          {isBoardOwner && (
            <>
              <Button variant="secondary" onClick={openEdit}>✏️ Edit</Button>
              <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>🗑️ Delete</Button>
            </>
          )}
        </div>
      </div>

      <div className={styles.viewToggle}>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'grid' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('grid')}
        >
          📋 Grid
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('map')}
        >
          🗺️ Map
        </button>
        <button
          className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.toggleActive : ''}`}
          onClick={() => setViewMode('calendar')}
        >
          📅 Calendar
        </button>
      </div>

      {viewMode !== 'calendar' && (board.latitude || pinLocations.length > 0) && (
        <div className={styles.mapWrap}>
          <MapContainer ref={mapRef} center={mapCenter} zoom={12} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {board.latitude && board.longitude && (
              <Marker position={[board.latitude, board.longitude]}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <strong>{board.name}</strong>
                    <div className={styles.popupMeta}>📍 {board.location || ''}</div>
                  </div>
                </Popup>
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
            {board.latitude && board.longitude && pins.length > 0 && pinLocations.length === 0 && (
              <Marker position={[board.latitude, board.longitude]}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <strong>📌 {pins.length} pin{pins.length !== 1 ? 's' : ''}</strong>
                    <div className={styles.popupDate}>at {board.location || 'this location'}</div>
                    {pins.slice(0, 5).map(p => (
                      <div key={p.id} className={styles.popupMeta}>• {p.title || p.content?.slice(0, 30) || 'Untitled'}</div>
                    ))}
                    {pins.length > 5 && <div className={styles.popupMeta}>+{pins.length - 5} more</div>}
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
      {viewMode !== 'calendar' && !board.latitude && pinLocations.length === 0 && (
        <div className={styles.noLocation}>
          <span className={styles.noLocationIcon}>📍</span>
          <p>No location set for this board.</p>
          {isBoardOwner && (
            <Button variant="secondary" onClick={openEdit}>Set Location</Button>
          )}
        </div>
      )}

      {viewMode === 'calendar' ? (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarHeader}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNavBtn}>←</button>
            <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNavBtn}>→</button>
          </div>
          <div className={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.calendarDayHeader}>{day}</div>
            ))}
            {getCalendarDays()}
          </div>
        </div>
      ) : pins.length === 0 ? (
        <EmptyState icon="📌" title="No pins yet" description="Be the first to pin something to this board!" action={session?.user ? { label: 'Pin Something', onClick: () => setShowCreateModal(true) } : undefined} />
      ) : (
        <div className={styles.pinsGrid}>
          {pins.map(pin => (
            <BoardPinCard
              key={pin.id}
              pin={pin}
              isOwner={pin.userId === userId}
              isBoardOwner={isBoardOwner}
              boardSlug={slug}
              onDelete={handleDelete}
              onFlyTo={handlePinFlyTo}
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

      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Board</h2>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label>Board Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="City, address, etc." />
              </div>
              <div className="form-row" style={{ display: 'flex', gap: 8 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Latitude</label>
                  <input type="number" step="any" value={editLatitude} onChange={e => setEditLatitude(e.target.value)} placeholder="40.7128" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Longitude</label>
                  <input type="number" step="any" value={editLongitude} onChange={e => setEditLongitude(e.target.value)} placeholder="-74.006" />
                </div>
              </div>
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={editing}>
                  {editing ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingPin && (
        <div className="modal-overlay" onClick={() => setEditingPin(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>✏️ Edit Pin</h2>
            <form onSubmit={handleEditPin}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={editPinTitle} onChange={e => setEditPinTitle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea value={editPinContent} onChange={e => setEditPinContent(e.target.value)} rows={3} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={editPinCategory} onChange={e => setEditPinCategory(e.target.value)}>
                  <option value="GENERAL">General</option>
                  <option value="PROMOTION">Promotion</option>
                  <option value="EVENT">Event</option>
                  <option value="SERVICE">Service</option>
                  <option value="HOUSING">Housing</option>
                  <option value="JOBS">Jobs</option>
                  <option value="FREE">Free</option>
                  <option value="LOST_FOUND">Lost & Found</option>
                </select>
              </div>
              <div className="form-group">
                <label>Contact Name</label>
                <input type="text" value={editPinContactName} onChange={e => setEditPinContactName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input type="email" value={editPinContactEmail} onChange={e => setEditPinContactEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Contact Phone</label>
                <input type="tel" value={editPinContactPhone} onChange={e => setEditPinContactPhone(e.target.value)} />
              </div>
              <div className="form-actions">
                <Button type="button" variant="ghost" onClick={() => setEditingPin(null)}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={savingPin}>
                  {savingPin ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteBoard}
        title="Delete Board"
        message={`Are you sure you want to delete "${board?.name}"? All pins will be permanently removed.`}
        confirmLabel="Delete Board"
        variant="danger"
      />
    </div>
  )

  function getCalendarDays() {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPadding = firstDay.getDay()
    const days: React.ReactNode[] = []

    for (let i = 0; i < startPadding; i++) {
      days.push(<div key={`empty-${i}`} className={styles.calendarCellEmpty}></div>)
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const pinsOnDay = pins.filter(p => {
        if (p.entityType !== 'EVENT') return false
        const dateSource = p.eventDate || p.createdAt
        if (!dateSource) return false
        const d = new Date(dateSource).toISOString().split('T')[0]
        return d === dateStr
      })

      days.push(
        <div key={day} className={`${styles.calendarCell} ${pinsOnDay.length > 0 ? styles.hasEvents : ''}`}>
          <span className={styles.calendarDayNumber}>{day}</span>
          <div className={styles.calendarEvents}>
            {pinsOnDay.slice(0, 3).map(pin => (
              <div key={pin.id} className={styles.calendarPinItem} onClick={() => {
                const idx = pins.findIndex(p => p.id === pin.id)
                if (idx >= 0) setCarouselIndex(idx)
              }}>
                <span className={styles.calendarPinTitle}>{pin.title || pin.content?.slice(0, 30) || 'Untitled'}</span>
                {pin.latitude && pin.longitude && <span className={styles.calendarPinLoc}>📍</span>}
              </div>
            ))}
            {pinsOnDay.length > 3 && <span className={styles.moreEvents}>+{pinsOnDay.length - 3} more</span>}
          </div>
        </div>
      )
    }

    return days
  }
}
