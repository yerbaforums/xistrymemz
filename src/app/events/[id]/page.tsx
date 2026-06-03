'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.css'
import dynamic from 'next/dynamic'
import { useToast } from '@/context/ToastContext'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { getUserProfileUrl } from '@/lib/utils'
import { CRYPTO_LOGOS } from '@/lib/constants'
import RoleBadge from '@/components/RoleBadge'
import EntityActions from '@/components/EntityActions'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Event } from '@/types/event'
import type { DonationAddr } from '@/types/product'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import TranslateButton from '@/components/TranslateButton'
import CollaborateButton from '@/components/CollaborateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import Skeleton from '@/components/Skeleton'
import LinkedItemsSection from '@/components/LinkedItemsSection'

const QRCodeModal = dynamic(() => import('@/components/QRCodeModal').then(mod => mod.QRCodeModal), { ssr: false })

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

function EventDetailContent() {
  const params = useParams()
  const { success, error, info } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showJoiners, setShowJoiners] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [sendingBulk, setSendingBulk] = useState(false)
  const [bulkSuccess, setBulkSuccess] = useState('')
  const [joinRole, setJoinRole] = useState<'ATTENDEE' | 'VOLUNTEER'>('ATTENDEE')
  const [copiedDonation, setCopiedDonation] = useState(false)
  const [qrOpen, setQrOpen] = useState<string | null>(null)
  const userDonationAddrs = useDonationAddresses()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    location: '',
    locationDetails: '',
    maxJoiners: 0,
    isTicketed: false,
    ticketPrice: 0,
    currency: 'USD',
    acceptsDonations: false,
    selectedDonationAddrs: [] as DonationAddr[],
    needsVolunteers: false,
    volunteerRoles: '',
    volunteerDescription: ''
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false)
  const router = useRouter()
  const [relatedEvents, setRelatedEvents] = useState<Event[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  const confirmDelete = async () => {
    if (!event) return
    setConfirmDeleteModal(true)
  }

  const handleDeleteConfirmed = async () => {
    if (!event) return
    setDeleting(true)
    setConfirmDeleteModal(false)
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' })
      if (res.ok) {
        success('Event deleted')
        router.push('/events')
      } else {
        const data = await res.json()
        error(data.error || 'Failed to delete event')
      }
    } catch (err) {
      console.error(err)
      error('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const startEditing = () => {
    if (!event) return
    setEditForm({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      locationDetails: event.locationDetails || '',
      maxJoiners: event.maxJoiners,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      acceptsDonations: event.acceptsDonations || false,
      selectedDonationAddrs: hydrateDonationAddresses(event.donationAddress, event.donationCurrency, event.donationAddresses),
      needsVolunteers: event.needsVolunteers || false,
      volunteerRoles: event.volunteerRoles ? (Array.isArray(event.volunteerRoles) ? event.volunteerRoles.join(', ') : '') : '',
      volunteerDescription: event.volunteerDescription || ''
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!event) return
    setSaving(true)
    try {
      let volunteerRoles = editForm.volunteerRoles
      if (editForm.needsVolunteers && volunteerRoles) {
        try { JSON.parse(volunteerRoles) } catch {
          volunteerRoles = JSON.stringify(volunteerRoles.split(',').map(r => r.trim()).filter(Boolean))
        }
      }

      const legacy = donationAddressesToLegacy(editForm.acceptsDonations ? editForm.selectedDonationAddrs : [])
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          volunteerRoles,
          ticketPrice: editForm.ticketPrice ? parseFloat(String(editForm.ticketPrice)) : 0,
          ...legacy,
          donationAddresses: editForm.acceptsDonations ? serializeDonationAddresses(editForm.selectedDonationAddrs) : null,
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setEvent(prev => prev ? { ...prev, ...updated, volunteerRoles: editForm.needsVolunteers ? editForm.volunteerRoles.split(',').map(r => r.trim()).filter(Boolean) : [] } : prev)
        success('Event updated')
        setIsEditing(false)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to update event')
      }
    } catch (err) {
      console.error(err)
      error('Failed to update event')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch session')
        return res.json()
      })
      .then(data => {
        if (data?.user?.id) {
          setUserId(data.user.id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/events/${params.id}`)
      .then(res => {
        if (!res.ok) {
          if (res.status === 404) {
            return null
          }
          throw new Error('Failed to fetch event')
        }
        return res.json()
      })
      .then(data => {
        setEvent(data)
        setLoading(false)
        if (data) {
          setRelatedLoading(true)
          fetch('/api/events')
            .then(res => res.ok ? res.json() : [])
            .then(events => {
              const items = Array.isArray(events)
                ? events
                    .filter((e: Event) => e.id !== data.id && (!data.eventCategory || e.eventCategory === data.eventCategory))
                    .slice(0, 3)
                : []
              setRelatedEvents(items)
              setRelatedLoading(false)
            })
            .catch(() => setRelatedLoading(false))
        }
      })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleJoin = async (role?: 'ATTENDEE' | 'VOLUNTEER') => {
    if (!userId || !event) {
      info('Please sign in to join events')
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/events/${event.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role || joinRole })
      })
      if (res.ok) {
        setEvent({ 
          ...event, 
          joined: true, 
          joiners: [...event.joiners, { id: '', userId, role: role || joinRole, user: { name: null, email: '', role: 'USER', userClass: null } }],
          _count: event._count ? { eventJoiners: event._count.eventJoiners + 1 } : undefined
        })
      } else {
        const data = await res.json()
        error(data.error || 'Failed to join event')
      }
    } catch (err) {
      console.error(err)
      error('Failed to join event')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!userId || !event) return
    setJoining(true)
    try {
      const res = await fetch(`/api/events/${event.id}/join`, { method: 'DELETE' })
      if (res.ok) {
        setEvent({ 
          ...event, 
          joined: false, 
          joiners: event.joiners.filter(j => j.userId !== userId),
          _count: event._count ? { eventJoiners: event._count.eventJoiners - 1 } : undefined
        })
      } else {
        const data = await res.json()
        error(data.error || 'Failed to leave event')
      }
    } catch (err) {
      console.error(err)
      error('Failed to leave event')
    } finally {
      setJoining(false)
    }
  }

  const handleBulkMessage = async () => {
    if (!bulkMessage.trim() || !event) return
    
    setSendingBulk(true)
    setBulkSuccess('')
    
    try {
      const res = await fetch(`/api/events/${event.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: bulkMessage })
      })
      
      if (res.ok) {
        setBulkSuccess(`Message sent to ${event.joiners.length} attendee(s)!`)
        setBulkMessage('')
      } else {
        error('Failed to send message')
      }
    } catch (err) {
      console.error(err)
      error('Failed to send message')
    } finally {
      setSendingBulk(false)
    }
  }

  if (loading) return <div className={styles.loading}>Loading...</div>
  if (!event) return (
    <div className={styles.page}>
      <div className={styles.notFound}>
        <h2>Event not found</h2>
        <p>This event may have been deleted or doesn't exist.</p>
        <Link href="/events" className="btn-primary">Browse Events</Link>
      </div>
    </div>
  )

  const isOwner = userId === event.userId || event.isOrganizer
  const joinerCount = event._count?.eventJoiners ?? event.joiners.length
  const center: [number, number] = event.latitude && event.longitude 
    ? [event.latitude, event.longitude]
    : [34.8697, -111.7610]

  return (
    <div className={styles.page}>
      <Link href="/events" className={styles.backLink}>
        ← Back to Events
      </Link>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.card}>
            <div className={styles.eventHeader}>
              {event.eventCategory && (
                <span className={`badge badge-${event.eventCategory.toLowerCase()}`}>
                  {event.eventCategory}
                </span>
              )}
              {event.isTicketed && (
                <span className="badge badge-active">
                  🎟️ Ticketed (${event.ticketPrice} {event.currency})
                </span>
              )}
              {event.eventDate && (
                <span className={styles.eventDate}>
                  📅 {new Date(event.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                  {' '}
                  {new Date(event.eventDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </span>
              )}
            </div>
            
            <div className={styles.titleRow}>
              <h1>{isEditing ? 'Editing Event' : event.title}</h1>
              <div className={styles.titleActions}>
                <button onClick={() => navigator.clipboard.writeText(window.location.href)} className={styles.editBtn} title="Copy link">🔗</button>
                {isOwner && !isEditing && (
                  <>
                    <button onClick={startEditing} className={styles.editBtn}>Edit</button>
                    <button onClick={confirmDelete} className={styles.deleteBtn} disabled={deleting}>
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <>
                <div className={styles.field}>
                  <label>Title</label>
                  <input type="text" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Description</label>
                  <textarea rows={4} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Location</label>
                  <input type="text" value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Location Details</label>
                  <input type="text" value={editForm.locationDetails} onChange={e => setEditForm(p => ({ ...p, locationDetails: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label>Max Attendees (0 = unlimited)</label>
                  <input type="number" value={editForm.maxJoiners} onChange={e => setEditForm(p => ({ ...p, maxJoiners: parseInt(e.target.value) || 0 }))} min={0} />
                </div>
                <div className={styles.checkboxField}>
                  <input type="checkbox" id="edit-ticketed" checked={editForm.isTicketed} onChange={e => setEditForm(p => ({ ...p, isTicketed: e.target.checked }))} />
                  <label htmlFor="edit-ticketed">Ticketed Event</label>
                </div>
                {editForm.isTicketed && (
                  <div className={styles.row}>
                    <div className={styles.field}>
                      <label>Ticket Price</label>
                      <input type="number" value={editForm.ticketPrice} onChange={e => setEditForm(p => ({ ...p, ticketPrice: parseFloat(e.target.value) || 0 }))} min={0} step={0.01} />
                    </div>
                    <div className={styles.field}>
                      <label>Currency</label>
                      <select value={editForm.currency} onChange={e => setEditForm(p => ({ ...p, currency: e.target.value }))}>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="XMR">XMR</option>
                        <option value="XTM">XTM</option>
                      </select>
                    </div>
                  </div>
                )}
                <div className={styles.checkboxField}>
                  <input type="checkbox" id="edit-donations" checked={editForm.acceptsDonations} onChange={e => setEditForm(p => ({ ...p, acceptsDonations: e.target.checked }))} />
                  <label htmlFor="edit-donations">Accept Donations</label>
                </div>
                {editForm.acceptsDonations && (
                  <DonationAddressPicker
                    savedAddresses={userDonationAddrs}
                    selectedAddresses={editForm.selectedDonationAddrs}
                    onAddressesChange={(addrs) => setEditForm(p => ({ ...p, selectedDonationAddrs: addrs }))}
                  />
                )}
                <div className={styles.checkboxField}>
                  <input type="checkbox" id="edit-volunteers" checked={editForm.needsVolunteers} onChange={e => setEditForm(p => ({ ...p, needsVolunteers: e.target.checked }))} />
                  <label htmlFor="edit-volunteers">Recruit Volunteers</label>
                </div>
                {editForm.needsVolunteers && (
                  <>
                    <div className={styles.field}>
                      <label>Volunteer Roles (comma separated)</label>
                      <input type="text" value={editForm.volunteerRoles} onChange={e => setEditForm(p => ({ ...p, volunteerRoles: e.target.value }))} placeholder="e.g., Setup, Cleanup" />
                    </div>
                    <div className={styles.field}>
                      <label>Volunteer Description</label>
                      <textarea rows={2} value={editForm.volunteerDescription} onChange={e => setEditForm(p => ({ ...p, volunteerDescription: e.target.value }))} />
                    </div>
                  </>
                )}
                <div className={styles.editActions}>
                  <button onClick={cancelEditing} className="btn-secondary" disabled={saving}>Cancel</button>
                  <button onClick={handleSave} className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.author}>
                  by{' '}
                  <Link href={getUserProfileUrl({ id: event.userId, username: event.organizer?.username })} className={styles.authorLink}>
                    {event.userName || 'Unknown'}
                  </Link>
                  {event.organizer?.role && <RoleBadge role={event.organizer.role} />}
                </p>
                {event.planTitle && event.planId && (
                  <p className={styles.planRef}>From: <Link href={`/plans/${event.planId}`} className={styles.planLink}>{event.planTitle}</Link></p>
                )}
                
                {event.imageUrl && (
                  <div className={styles.detailImageWrapper}>
                    <img src={event.imageUrl} alt={event.title} className={styles.detailImage} />
                  </div>
                )}

                {event.description && (
                  <>
                    <p className={styles.description}>{event.description}</p>
                    <TranslateButton text={event.description} />
                  </>
                )}

                {event.hashtags && event.hashtags.length > 0 && (
                  <div className={styles.hashtagList}>
                    {event.hashtags.map(tag => (
                      <Link key={tag} href={`/hashtag/${tag}`} className={styles.hashtagChip}>
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                <div className={styles.locationSection}>
                  <h3>📍 Location</h3>
                  <p className={styles.locationType}>{event.location || 'Not specified'}</p>
                  {event.locationDetails && (
                    <p className={styles.locationDetails}>{event.locationDetails}</p>
                  )}
                </div>
              </>
            )}

            {event.latitude && event.longitude && (
              <div className={styles.mapSection}>
                <h3>🗺️ Event Location</h3>
                <div className={styles.mapContainer}>
                  <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[event.latitude, event.longitude]}>
                      <Popup>
                        <strong>{event.title}</strong>
                        <br />
                        {event.location}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            )}

            <div className={styles.joinActions}>
              {!isOwner && !event.joined && (
                <>
                  {event.maxJoiners === 0 || joinerCount < event.maxJoiners ? (
                    <div className={styles.joinButtonGroup}>
                      <button
                        onClick={() => handleJoin('ATTENDEE')}
                        disabled={joining}
                        className={styles.joinBtn}
                      >
                        {joining ? 'Processing...' : (event.isTicketed ? 'Get Tickets' : 'RSVP as Attendee')}
                      </button>
                      {event.needsVolunteers && (
                        <button
                          onClick={() => handleJoin('VOLUNTEER')}
                          disabled={joining}
                          className={styles.volunteerBtn}
                        >
                          🙋 Volunteer
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className={styles.fullBadge}>Event is Full</span>
                  )}
                </>
              )}
              {!isOwner && event.joined && (
                <button
                  onClick={handleLeave}
                  disabled={joining}
                  className={styles.leaveBtn}
                >
                  {joining ? 'Processing...' : 'Leave Event'}
                </button>
              )}
              {!isOwner && (
                <CollaborateButton entityType="EVENT" entityId={event.id} label="🤝 Propose Collab" variant="secondary" />
              )}
              {session?.user && (
                <PinToBoardButton
                  entityType="EVENT"
                  entityId={event.id}
                  entityTitle={event.title}
                  entityImage={event.imageUrl || undefined}
                  entityLatitude={event.latitude || undefined}
                  entityLongitude={event.longitude || undefined}
                  variant="ghost"
                  label="📌 Pin to Board"
                />
              )}
            </div>

            {event.needsVolunteers && event.volunteerDescription && (
              <div className={styles.volunteerSection}>
                <h3>🙋 Volunteer Opportunities</h3>
                <p>{event.volunteerDescription}</p>
                {event.volunteerRoles && event.volunteerRoles.length > 0 && (
                  <div className={styles.volunteerRoles}>
                    {event.volunteerRoles.map((role, i) => (
                      <span key={i} className={styles.volRoleBadge}>{role}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.statsCard}>
            <h3>Event Stats</h3>
            <div className={styles.stat}>
              <span>👥 Attendees</span>
              <span>{joinerCount} {event.maxJoiners > 0 ? `/ ${event.maxJoiners}` : ''}</span>
            </div>
            {event.eventDate && (
              <div className={styles.stat}>
                <span>📅 Date</span>
                <span>{new Date(event.eventDate).toLocaleDateString()}</span>
              </div>
            )}
            {event.location && (
              <div className={styles.stat}>
                <span>📍 Location</span>
                <span>{event.location}</span>
              </div>
            )}
            {event.isTicketed && (
              <div className={styles.stat}>
                <span>🎟️ Ticket</span>
                <span>${event.ticketPrice} {event.currency}</span>
              </div>
            )}
            {event.needsVolunteers && (
              <div className={styles.stat}>
                <span>🙋 Volunteers</span>
                <span>{event.joiners.filter(j => j.role === 'VOLUNTEER').length} signed up</span>
              </div>
            )}
          </div>

          {event.acceptsDonations && (
            <div className={styles.donationCard}>
              <h3>Donations Accepted</h3>
              {(() => {
                let addrs: DonationAddr[] = []
                if (event.donationAddresses) {
                  try { const p = JSON.parse(event.donationAddresses); if (Array.isArray(p)) addrs = p } catch {}
                }
                if (addrs.length > 0) return addrs.map(da => {
                  const shortAddr = da.address.length > 20 ? da.address.slice(0, 10) + '...' + da.address.slice(-8) : da.address
                  return (
                    <div key={da.id || da.address} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                      <img src={`/crypto-logos/${CRYPTO_LOGOS[da.currency] || 'ethereum.png'}`} alt="" width={20} height={20} style={{ borderRadius: '50%' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{da.label || da.currency}</div>
                        <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{shortAddr}</code>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className={styles.copyDonationBtn} onClick={() => { navigator.clipboard.writeText(da.address); setCopiedDonation(true); setTimeout(() => setCopiedDonation(false), 2000) }}>
                          {copiedDonation ? 'Copied' : 'Copy'}
                        </button>
                        <button className={styles.copyDonationBtn} onClick={() => setQrOpen(da.address)}>QR</button>
                      </div>
                    </div>
                  )
                })
                if (event.donationAddress) return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                    <img src={`/crypto-logos/${CRYPTO_LOGOS[event.donationCurrency || 'ETH'] || 'ethereum.png'}`} alt="" width={20} height={20} style={{ borderRadius: '50%' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{event.donationCurrency || 'ETH'}</div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{event.donationAddress.length > 20 ? event.donationAddress.slice(0, 10) + '...' + event.donationAddress.slice(-8) : event.donationAddress}</code>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className={styles.copyDonationBtn} onClick={() => { navigator.clipboard.writeText(event.donationAddress || ''); setCopiedDonation(true); setTimeout(() => setCopiedDonation(false), 2000) }}>
                        {copiedDonation ? 'Copied' : 'Copy'}
                      </button>
                      <button className={styles.copyDonationBtn} onClick={() => setQrOpen(event.donationAddress || '')}>QR</button>
                    </div>
                  </div>
                )
                return null
              })()}
              <p className={styles.donationHint}>Send crypto to any address above to support</p>
            </div>
          )}
          {qrOpen && (() => {
            let addrs: DonationAddr[] = []
            if (event?.donationAddresses) {
              try { const p = JSON.parse(event.donationAddresses); if (Array.isArray(p)) addrs = p } catch {}
            }
            const addr = addrs.find(a => a.address === qrOpen)
            return (
              <QRCodeModal isOpen={true} onClose={() => setQrOpen(null)} currency={addr?.currency || event?.donationCurrency || 'ETH'} address={qrOpen} />
            )
          })()}

          {isOwner && joinerCount > 0 && (
            <div className={styles.joinersCard}>
              <button 
                className={styles.ownerToggle}
                onClick={() => setShowJoiners(!showJoiners)}
              >
                <h3>👥 Attendees ({joinerCount})</h3>
                <span>{showJoiners ? '▼' : '▶'}</span>
              </button>
              
               {showJoiners && (
                <div className={styles.joinerList}>
                  {event.joiners.map((j, i) => (
                    <div key={`${j.id}-${i}`} className={styles.joinerItem}>
                      <Link href={getUserProfileUrl({ id: j.userId, username: j.user.username })} className={styles.joinerLink}>
                        <span className={styles.joinerName}>
                          {j.user.name || j.user.email || `User ${i + 1}`}
                        </span>
                        {j.role === 'VOLUNTEER' && (
                          <span className={styles.volRoleBadgeSmall}>🙋</span>
                        )}
                        {j.user.role && j.user.role !== 'USER' && (
                          <span className={styles.joinerRoleBadge}><RoleBadge role={j.user.role} /></span>
                        )}
                        {j.user.userClass && (
                          <span className={styles.joinerClass}>{j.user.userClass.split(',')[0].trim()}</span>
                        )}
                      </Link>
                      <Link href={`/messages?user=${j.userId}`} className={styles.messageBtn}>
                        💬
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {showJoiners && (
                <div className={styles.bulkMessageSection}>
                  <h4>📢 Send Message to All</h4>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Type your message to all attendees..."
                    rows={3}
                    className={styles.bulkTextarea}
                  />
                  <button
                    onClick={handleBulkMessage}
                    disabled={sendingBulk || !bulkMessage.trim()}
                    className={styles.bulkSendBtn}
                  >
                    {sendingBulk ? 'Sending...' : 'Send to All'}
                  </button>
                  {bulkSuccess && (
                    <p className={styles.bulkSuccess}>{bulkSuccess}</p>
                  )}
                </div>
              )}
            </div>
          )}

           {!isOwner && joinerCount > 0 && (
            <div className={styles.joinersCard}>
              <h3>Joined ({joinerCount})</h3>
              <div className={styles.joinerList}>
                {event.joiners.slice(0, 10).map((j, i) => (
                  <Link key={`${j.id}-${i}`} href={getUserProfileUrl({ id: j.userId, username: j.user.username })} className={styles.joinerBadgeLink}>
                    <span className={styles.joinerBadge}>
                      {j.user.name || j.user.email || `User ${i + 1}`}
                      {j.role === 'VOLUNTEER' && ' 🙋'}
                    </span>
                    {j.user.role && j.user.role !== 'USER' && (
                      <span className={styles.badgeDot} title={j.user.role}></span>
                    )}
                  </Link>
                ))}
                {joinerCount > 10 && (
                  <span className={styles.joinerBadge}>
                    +{joinerCount - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className={styles.statsCard}>
            <EntityActions
              entityType="EVENT"
              entityId={event.id}
              title={event.title}
              authorId={event.userId}
              variant="bar"
            />
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteModal}
        onClose={() => setConfirmDeleteModal(false)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Event"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <LinkedItemsSection
        entityType="EVENT"
        entityId={event?.id || ''}
        currentUserId={userId}
      />

      {relatedEvents.length > 0 && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>More Events</h2>
          <div className={styles.relatedGrid}>
            {relatedEvents.map(re => (
              <Link key={re.id} href={`/events/${re.id}`} className={styles.relatedCard}>
                {re.imageUrl && (
                  <div className={styles.relatedCardImage}>
                    <img src={re.imageUrl} alt={re.title} />
                  </div>
                )}
                <div className={styles.relatedCardBody}>
                  {re.eventCategory && <span className={styles.relatedCardType}>{re.eventCategory}</span>}
                  <span className={styles.relatedCardTitle}>{re.title}</span>
                  {re.eventDate && <span className={styles.relatedCardDate}>{new Date(re.eventDate).toLocaleDateString()}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {relatedLoading && (
        <div className={styles.relatedSection}>
          <h2 className={styles.relatedTitle}>More Events</h2>
          <div className={styles.relatedGrid}>
            {[1,2,3].map(i => (
              <div key={i} className={styles.relatedCard}>
                <Skeleton height="120px" borderRadius="8px 8px 0 0" />
                <div className={styles.relatedCardBody}>
                  <Skeleton width="40%" height="0.75rem" />
                  <Skeleton width="80%" height="0.9rem" />
                  <Skeleton width="50%" height="0.75rem" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PublicEventPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
        <EventDetailContent />
      </Suspense>
    </ErrorBoundary>
  )
}