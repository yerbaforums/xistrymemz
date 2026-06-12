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
import { geocodeLocation } from '@/lib/geocoding'
import { EmptyState } from '@/components/EmptyState'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'
import Loading from '@/components/Loading'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

let L: any
if (typeof window !== 'undefined') {
  L = require('leaflet')
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

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
  likeCount?: number
  commentCount?: number
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

  useEffect(() => {
    import('leaflet/dist/leaflet.css')
  }, [])

  const pinLocations = pins.filter(p => p.latitude && p.longitude)

  const fetchBoard = useCallback(async () => {
    setLoading(true)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`/api/boards/${slug}?limit=50`, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) { const err = await res.json().catch(() => ({ error: 'Request failed' })); console.error('Board fetch not ok:', err); toastError(err.error || 'Failed to load board'); return }
      const data = await res.json()
      if (data.error) { console.error('Board API error:', data.error); toastError(data.error); return }
      setBoard(data.board)
      setPins(data.pins || [])
      setTotal(data.total || 0)
    } catch (e: any) {
      if (e?.name === 'AbortError') { console.error('Board fetch timed out'); toastError('Request timed out') }
      else { console.error('Fetch board error:', e); toastError('Failed to load board') }
    }
    finally { setLoading(false) }
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

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handlePinDelete = async () => {
    try {
      const res = await fetch(`/api/boards/${slug}/pins/${deleteTarget}`, { method: 'DELETE' })
      if (res.ok) {
        setPins(prev => prev.filter(p => p.id !== deleteTarget))
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

  const handleGeocode = async () => {
    if (!editLocation.trim()) return
    try {
      const result = await geocodeLocation(editLocation)
      if (result) {
        setEditLatitude(result.latitude.toString())
        setEditLongitude(result.longitude.toString())
        success('📍 Location geocoded!')
      } else { toastError('Could not geocode this location') }
    } catch { toastError('Geocoding failed') }
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
        <Loading size="medium" />
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

  const getBoardIcon = () => {
    if (!L) return undefined
    return L.divIcon({
      className: '',
      html: `<div style="width:32px;height:32px;background:#00d9ff;border:3px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📌</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    })
  }

  const getPinIcon = (category: string | null) => {
    if (!L) return undefined
    const colors: Record<string, string> = {
      GENERAL: '#00d9ff', LOST_FOUND: '#ef4444', PROMOTION: '#f59e0b',
      EVENT: '#8b5cf6', SERVICE: '#22c55e', HOUSING: '#3b82f6',
      JOBS: '#f97316', FREE: '#10b981',
    }
    const color = colors[category || 'GENERAL'] || '#00d9ff'
    return L.divIcon({
      className: '',
      html: `<div style="width:24px;height:24px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 4px rgba(0,0,0,0.3);">📍</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      popupAnchor: [0, -24],
    })
  }

  const mapCenter: [number, number] = board.latitude != null && board.longitude != null
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

      {viewMode === 'map' && (
        <div className={styles.mapWrap}>
          {!board.latitude && !pinLocations.length && (
            <div className={styles.mapOverlay}>
              <span>📍 No location set for this board.</span>
              {isBoardOwner && <button onClick={openEdit} className={styles.overlayBtn}>Set Location</button>}
            </div>
          )}
          <MapContainer ref={mapRef} center={mapCenter} zoom={12} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {board.latitude != null && board.longitude != null && (
              <Marker position={[board.latitude, board.longitude]} icon={getBoardIcon()}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <div className={styles.popupTitle}>{board.name}</div>
                    {board.description && <div className={styles.popupDesc}>{board.description.slice(0, 100)}</div>}
                    <div className={styles.popupStats}>
                      <span>📍 {board.location || 'Unknown location'}</span>
                      <span>📌 {board.pinCount || pins.length} pins</span>
                      <span>👥 {memberCount} members</span>
                    </div>
                    <Link href={`/boards/${board.slug}`} className={styles.popupLink}>View Board →</Link>
                  </div>
                </Popup>
              </Marker>
            )}
            {pinLocations.map(pin => (
              <Marker key={pin.id} position={[pin.latitude!, pin.longitude!]} icon={getPinIcon(pin.category)}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <div className={styles.popupHeader}>
                      <span className={styles.popupUserName}>{pin.user.name || 'Unknown'}</span>
                      {pin.category && (
                        <span className={styles.popupCategory}>{pin.category}</span>
                      )}
                    </div>
                    <div className={styles.popupTitle}>{pin.title || pin.content?.slice(0, 60)}</div>
                    {pin.content && <div className={styles.popupDesc}>{pin.content.slice(0, 80)}</div>}
                    {pin.entityType && pin.entityTitle && (
                      <div className={styles.popupMeta}>📎 {pin.entityTitle}</div>
                    )}
                    {(pin.likeCount != null || pin.commentCount != null) && (
                      <div className={styles.popupStats}>
                        {pin.likeCount != null && <span>❤️ {pin.likeCount}</span>}
                        {pin.commentCount != null && <span>💬 {pin.commentCount}</span>}
                      </div>
                    )}
                    <div className={styles.popupDate}>
                      {new Date(pin.createdAt).toLocaleDateString()}
                    </div>
                    <Link
                      href="#"
                      className={styles.popupLink}
                      onClick={(e) => {
                        e.preventDefault()
                        const idx = pins.findIndex(p => p.id === pin.id)
                        if (idx >= 0) setCarouselIndex(idx)
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
            {board.latitude != null && board.longitude != null && pins.length > 0 && pinLocations.length === 0 && (
              <Marker position={[board.latitude, board.longitude]} icon={getBoardIcon()}>
                <Popup>
                  <div className={styles.pinPopup}>
                    <div className={styles.popupTitle}>📌 {pins.length} pin{pins.length !== 1 ? 's' : ''}</div>
                    <div className={styles.popupDate}>at {board.location || 'this location'}</div>
                    <div className={styles.popupStats}>
                      <span>👥 {memberCount} members</span>
                      <span>📌 {pins.length} total</span>
                    </div>
                    {pins.slice(0, 5).map(p => (
                      <div key={p.id} className={styles.popupMeta}>• {p.title || p.content?.slice(0, 30) || 'Untitled'}</div>
                    ))}
                    {pins.length > 5 && <div className={styles.popupMeta}>+{pins.length - 5} more</div>}
                    <Link href={`/boards/${board.slug}`} className={styles.popupLink}>View Board →</Link>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}

      {viewMode === 'calendar' && (
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
      )}
      {viewMode === 'grid' && (
        pins.length === 0 ? (
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
                onDelete={(id) => setDeleteTarget(id)}
                onFlyTo={handlePinFlyTo}
                onView={(pinId) => {
                  const idx = pins.findIndex(p => p.id === pinId)
                  if (idx >= 0) setCarouselIndex(idx)
                }}
              />
            ))}
          </div>
        )
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
                <div className="form-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <input type="text" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="City, address, etc." style={{ flex: 1 }} />
                  <button type="button" className={styles.overlayBtn} onClick={handleGeocode} title="Look up lat/lng from city name">📍 Geocode</button>
                </div>
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
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handlePinDelete}
        title="Delete Pin"
        message="Remove this pin from the board?"
        confirmLabel="Delete"
        variant="danger"
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
