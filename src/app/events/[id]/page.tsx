'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import styles from './page.module.css'
import dynamic from 'next/dynamic'
import { useToast } from '@/context/ToastContext'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import Button from '@/components/ui/Button'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import type { EventFormData } from '@/components/EventFormFields'
import { getUserProfileUrl } from '@/lib/utils'
import { CRYPTO_LOGOS } from '@/lib/constants'
import RoleBadge from '@/components/RoleBadge'
import ShareBar from '@/components/ShareBar'
import EntityActions from '@/components/EntityActions'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Event } from '@/types/event'
import type { DonationAddr } from '@/types/product'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import TranslateButton from '@/components/TranslateButton'
import CollaborateButton from '@/components/CollaborateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import Skeleton from '@/components/Skeleton'
import Loading from '@/components/Loading'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import Breadcrumbs from '@/components/Breadcrumbs'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'

const QRCodeModal = dynamic(() => import('@/components/QRCodeModal').then(mod => mod.QRCodeModal), { ssr: false })


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
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [purchasing, setPurchasing] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<Array<{ id: string; name: string | null; image: string | null }>>([])
  const [selectedUsers, setSelectedUsers] = useState<Array<{ id: string; name: string | null }>>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  const [invitations, setInvitations] = useState<Array<{ id: string; user: { id: string; name: string | null; image: string | null }; status: string }>>([])
  const [tickets, setTickets] = useState<Array<{ id: string; user: { id: string; name: string | null; image: string | null }; quantity: number; paymentStatus: string; ticketCode: string }>>([])
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [verifyingTicket, setVerifyingTicket] = useState<string | null>(null)
  const userDonationAddrs = useDonationAddresses()
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState<EventFormData>(() => getDefaultEventFormData())
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
    setEditFormData({
      title: event.title,
      description: event.description || '',
      imageUrl: '',
      images: [],
      eventCategory: event.eventCategory || 'GENERAL',
      eventDate: event.eventDate ? event.eventDate.slice(0, 16) : '',
      endDate: event.endDate ? event.endDate.slice(0, 16) : '',
      location: event.location || '',
      locationDetails: event.locationDetails || '',
      maxJoiners: event.maxJoiners,
      isTicketed: event.isTicketed,
      ticketPrice: event.ticketPrice,
      currency: event.currency,
      visibility: 'PUBLIC',
      eventType: 'public',
      needsVolunteers: event.needsVolunteers || false,
      volunteerRoles: event.volunteerRoles ? (Array.isArray(event.volunteerRoles) ? event.volunteerRoles.join(', ') : '') : '',
      volunteerDescription: event.volunteerDescription || '',
      acceptsDonations: event.acceptsDonations || false,
      selectedDonationAddrs: hydrateDonationAddresses(event.donationAddress, event.donationCurrency, event.donationAddresses),
      hashtags: event.hashtags || [],
      planId: event.planId || null,
      planTitle: event.planTitle || null,
      groupId: event.group?.id || null,
      groupTitle: event.group?.name || null,
      schoolId: null,
      shopId: null,
    })
    setIsEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    setSaving(true)
    try {
      let volunteerRoles = editFormData.volunteerRoles
      if (editFormData.needsVolunteers && volunteerRoles) {
        try { JSON.parse(volunteerRoles) } catch {
          volunteerRoles = JSON.stringify(volunteerRoles.split(',').map(r => r.trim()).filter(Boolean))
        }
      }

      const legacy = donationAddressesToLegacy(editFormData.acceptsDonations ? editFormData.selectedDonationAddrs : [])
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          eventCategory: editFormData.eventCategory,
          eventDate: editFormData.eventDate || undefined,
          endDate: editFormData.endDate || undefined,
          location: editFormData.location,
          locationDetails: editFormData.locationDetails,
          maxJoiners: editFormData.maxJoiners,
          isTicketed: editFormData.isTicketed,
          ticketPrice: editFormData.ticketPrice,
          currency: editFormData.currency,
          acceptsDonations: editFormData.acceptsDonations,
          ...legacy,
          donationAddresses: editFormData.acceptsDonations ? serializeDonationAddresses(editFormData.selectedDonationAddrs) : null,
          needsVolunteers: editFormData.needsVolunteers,
          volunteerRoles,
          volunteerDescription: editFormData.volunteerDescription,
          hashtags: editFormData.hashtags,
          planId: editFormData.planId,
          groupId: editFormData.groupId,
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setEvent(prev => prev ? { ...prev, ...updated, volunteerRoles: editFormData.needsVolunteers ? editFormData.volunteerRoles.split(',').map(r => r.trim()).filter(Boolean) : [] } : prev)
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

  const handlePurchaseTickets = async () => {
    if (!userId || !event) return
    setPurchasing(true)
    try {
      const res = await fetch(`/api/events/${event.id}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: ticketQuantity })
      })
      if (res.ok) {
        success('Tickets purchased!')
        setEvent(prev => prev ? { ...prev, joined: true } : prev)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to purchase tickets')
      }
    } catch {
      error('Failed to purchase tickets')
    } finally {
      setPurchasing(false)
    }
  }

  const loadInvitations = async () => {
    if (!event) return
    try {
      const res = await fetch(`/api/events/${event.id}/invite`)
      const data = await res.json()
      setInvitations(data?.data?.invitations || data?.invitations || [])
    } catch {}
  }

  const handleSearchUsers = async (q: string) => {
    setInviteSearch(q)
    if (q.length < 2) { setInviteResults([]); return }
    setSearchingUsers(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=10`)
      const data = await res.json()
      setInviteResults(data?.data?.users || data?.users || [])
    } catch {} finally { setSearchingUsers(false) }
  }

  const handleSendInvites = async () => {
    if (!event || selectedUsers.length === 0) return
    try {
      const res = await fetch(`/api/events/${event.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers.map(u => u.id), message: '' })
      })
      if (res.ok) {
        success('Invitations sent!')
        setShowInviteModal(false)
        setSelectedUsers([])
        loadInvitations()
      } else {
        const data = await res.json()
        error(data.error || 'Failed to send invites')
      }
    } catch {
      error('Failed to send invites')
    }
  }

  const handleRespondInvite = async (status: 'ACCEPTED' | 'DECLINED') => {
    if (!event) return
    try {
      const res = await fetch(`/api/events/${event.id}/invite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        if (status === 'ACCEPTED') {
          setEvent(prev => prev ? { ...prev, joined: true } : prev)
        }
        loadInvitations()
      }
    } catch {}
  }

  const handleVerifyTicket = async (ticketId: string, action: string) => {
    if (!event) return
    setVerifyingTicket(ticketId)
    try {
      const res = await fetch(`/api/events/${event.id}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (res.ok) {
        success(action === 'verify' ? 'Ticket verified!' : action === 'approve' ? 'Ticket approved!' : 'Ticket updated!')
        setEvent(prev => prev ? { ...prev } : prev)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to update ticket')
      }
    } catch {
      error('Failed to update ticket')
    } finally {
      setVerifyingTicket(null)
    }
  }

  const loadTickets = async () => {
    if (!event) return
    try {
      const res = await fetch(`/api/events/${event.id}/tickets`)
      const data = await res.json()
      setTickets(data?.data?.tickets || data?.tickets || [])
    } catch {}
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

  if (loading) return <Skeleton width="100%" height="2rem" />
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
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: event.title || 'Event' },
      ]} />
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
                <Button onClick={() => navigator.clipboard.writeText(window.location.href)} className={styles.editBtn} variant="ghost" title="Copy link">🔗</Button>
                {isOwner && !isEditing && (
                  <>
                    <Button onClick={startEditing} className={styles.editBtn} variant="ghost">Edit</Button>
                    <Button onClick={confirmDelete} className={styles.deleteBtn} variant="danger" disabled={deleting}>
                      {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {isEditing ? (
              <>
                <EventFormFields
                  formData={editFormData}
                  onChange={(patch) => setEditFormData(prev => ({ ...prev, ...patch }))}
                  onSubmit={handleSave}
                  mode="edit"
                  saving={saving}
                  onCancel={() => setIsEditing(false)}
                  submitLabel="Save"
                />
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
                    event.isTicketed ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))} className={styles.qtyBtn}>−</button>
                          <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{ticketQuantity}</span>
                          <button onClick={() => setTicketQuantity(Math.min(10, ticketQuantity + 1))} className={styles.qtyBtn}>+</button>
                        </div>
                        <Button onClick={handlePurchaseTickets} disabled={purchasing} variant="primary" className={styles.joinBtn}>
                          {purchasing ? 'Processing...' : `Purchase ${ticketQuantity} Ticket${ticketQuantity > 1 ? 's' : ''} $${(event.ticketPrice * ticketQuantity).toFixed(2)}`}
                        </Button>
                        {event.needsVolunteers && (
                          <Button onClick={() => handleJoin('VOLUNTEER')} disabled={joining} variant="secondary" className={styles.volunteerBtn}>
                            🙋 Volunteer
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.joinButtonGroup}>
                        <Button onClick={() => handleJoin('ATTENDEE')} disabled={joining} className={styles.joinBtn} variant="primary">
                          {joining ? 'Processing...' : 'RSVP as Attendee'}
                        </Button>
                        {event.needsVolunteers && (
                          <Button onClick={() => handleJoin('VOLUNTEER')} disabled={joining} className={styles.volunteerBtn} variant="secondary">
                            🙋 Volunteer
                          </Button>
                        )}
                      </div>
                    )
                  ) : (
                    <span className={styles.fullBadge}>Event is Full</span>
                  )}
                </>
              )}
              {!isOwner && event.joined && (
                <Button onClick={handleLeave} disabled={joining} className={styles.leaveBtn} variant="secondary">
                  {joining ? 'Processing...' : 'Leave Event'}
                </Button>
              )}
              {!isOwner && (
                <CollaborateButton entityType="EVENT" entityId={event.id} label="🤝 Propose Collab" variant="secondary" />
              )}
              {userId && (
                <PinToBoardButton
                  entityType="EVENT"
                  entityId={event.id}
                  entityTitle={event.title}
                  entityImage={event.imageUrl || undefined}
                  entityLatitude={event.latitude || undefined}
                  entityLongitude={event.longitude || undefined}
                  variant="ghost"
                  label="Pin to Board"
                />
              )}
              {isOwner && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, width: '100%' }}>
                  <Button onClick={() => { loadInvitations(); setShowInviteModal(true) }} variant="secondary">
                    👥 Invite People
                  </Button>
                  {event.isTicketed && (
                    <Button onClick={() => { loadTickets(); setShowTicketModal(true) }} variant="secondary">
                      🎟️ Manage Tickets ({tickets.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
              <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <div className={styles.modalHeader}>
                    <h3>Invite People</h3>
                    <button onClick={() => setShowInviteModal(false)} className={styles.modalClose}>✕</button>
                  </div>
                  <div className={styles.modalBody}>
                    <input
                      type="text" value={inviteSearch} onChange={e => handleSearchUsers(e.target.value)}
                      placeholder="Search users by name..."
                      className={styles.inviteSearch}
                    />
                    {searchingUsers && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Searching...</p>}
                    {inviteResults.length > 0 && (
                      <div className={styles.inviteResults}>
                        {inviteResults.map(u => (
                          <div key={u.id} className={styles.inviteResultItem}
                            onClick={() => {
                              if (!selectedUsers.find(s => s.id === u.id)) {
                                setSelectedUsers([...selectedUsers, { id: u.id, name: u.name }])
                              }
                            }}
                          >
                            <span>{u.name || 'Unknown'}</span>
                            {selectedUsers.find(s => s.id === u.id) && <span>✓</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedUsers.length > 0 && (
                      <div className={styles.selectedUsers}>
                        {selectedUsers.map(u => (
                          <span key={u.id} className={styles.selectedUserChip}>
                            {u.name} <button onClick={() => setSelectedUsers(selectedUsers.filter(s => s.id !== u.id))}>✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.modalFooter}>
                    <Button onClick={() => setShowInviteModal(false)} variant="ghost">Cancel</Button>
                    <Button onClick={handleSendInvites} disabled={selectedUsers.length === 0} variant="primary">
                      Send Invitations ({selectedUsers.length})
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Ticket Management Modal (Organizer) */}
            {showTicketModal && (
              <div className={styles.modalOverlay} onClick={() => setShowTicketModal(false)}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                  <div className={styles.modalHeader}>
                    <h3>Ticket Management</h3>
                    <button onClick={() => setShowTicketModal(false)} className={styles.modalClose}>✕</button>
                  </div>
                  <div className={styles.modalBody}>
                    {tickets.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tickets purchased yet.</p>
                    ) : (
                      <div className={styles.ticketList}>
                        {tickets.map(t => (
                          <div key={t.id} className={styles.ticketCard}>
                            <div className={styles.ticketInfo}>
                              <strong>{t.user.name || 'Unknown'}</strong>
                              <span className={styles.ticketMeta}>Qty: {t.quantity} · {t.paymentStatus}</span>
                              <code className={styles.ticketCode}>Code: {t.ticketCode.slice(0, 8)}...</code>
                            </div>
                            <div className={styles.ticketActions}>
                              {t.paymentStatus === 'PENDING' && (
                                <button onClick={() => handleVerifyTicket(t.id, 'mark-paid')} disabled={verifyingTicket === t.id} className={styles.ticketActionBtn}>Mark Paid</button>
                              )}
                              {t.paymentStatus === 'PAID' && (
                                <button onClick={() => handleVerifyTicket(t.id, 'approve')} disabled={verifyingTicket === t.id} className={styles.ticketActionBtn}>Approve</button>
                              )}
                              {t.paymentStatus === 'APPROVED' && (
                                <button onClick={() => handleVerifyTicket(t.id, 'verify')} disabled={verifyingTicket === t.id} className={styles.ticketActionBtn}>Verify ✓</button>
                              )}
                              {!['VERIFIED', 'CANCELLED'].includes(t.paymentStatus) && (
                                <button onClick={() => handleVerifyTicket(t.id, 'cancel')} disabled={verifyingTicket === t.id} className={styles.ticketActionBtnDanger}>Cancel</button>
                              )}
                              {t.paymentStatus === 'VERIFIED' && <span className={styles.verifiedBadge}>✅ Verified</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                        <Button className={styles.copyDonationBtn} variant="ghost" onClick={() => { navigator.clipboard.writeText(da.address); setCopiedDonation(true); setTimeout(() => setCopiedDonation(false), 2000) }}>
                          {copiedDonation ? 'Copied' : 'Copy'}
                        </Button>
                        <Button className={styles.copyDonationBtn} variant="ghost" onClick={() => setQrOpen(da.address)}>QR</Button>
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
                      <Button className={styles.copyDonationBtn} variant="ghost" onClick={() => { navigator.clipboard.writeText(event.donationAddress || ''); setCopiedDonation(true); setTimeout(() => setCopiedDonation(false), 2000) }}>
                        {copiedDonation ? 'Copied' : 'Copy'}
                      </Button>
                      <Button className={styles.copyDonationBtn} variant="ghost" onClick={() => setQrOpen(event.donationAddress || '')}>QR</Button>
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
              <Button 
                className={styles.ownerToggle}
                variant="ghost"
                onClick={() => setShowJoiners(!showJoiners)}
              >
                <h3>👥 Attendees ({joinerCount})</h3>
                <span>{showJoiners ? '▼' : '▶'}</span>
              </Button>
              
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
                  <Button
                    onClick={handleBulkMessage}
                    disabled={sendingBulk || !bulkMessage.trim()}
                    className={styles.bulkSendBtn}
                    variant="primary"
                  >
                    {sendingBulk ? 'Sending...' : 'Send to All'}
                  </Button>
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
      <Suspense fallback={<Loading size="medium" />}>
        <EventDetailContent />
      </Suspense>
    </ErrorBoundary>
  )
}