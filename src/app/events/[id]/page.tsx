'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import styles from './page.module.css'
import dynamic from 'next/dynamic'
import { useToast } from '@/context/ToastContext'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Joiner {
  id: string
  userId: string
  user: { name: string | null; email: string; image?: string }
}

interface Event {
  id: string
  title: string
  description: string | null
  eventCategory: string | null
  eventDate: string | null
  endDate: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number
  currency: string
  planId: string | null
  planTitle: string | null
  userId: string
  userName: string | null
  organizer?: { id: string; name: string; email: string; image: string }
  group?: { id: string; name: string }
  joiners: Joiner[]
  joined?: boolean
  isOrganizer?: boolean
  _count?: { eventJoiners: number }
}

function EventDetailContent() {
  const params = useParams()
  const { error, info } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showJoiners, setShowJoiners] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [sendingBulk, setSendingBulk] = useState(false)
  const [bulkSuccess, setBulkSuccess] = useState('')

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
      })
      .catch(() => setLoading(false))
  }, [params.id])

  const handleJoin = async () => {
    if (!userId || !event) {
      info('Please sign in to join events')
      return
    }
    setJoining(true)
    try {
      const res = await fetch(`/api/events/${event.id}/join`, { method: 'POST' })
      if (res.ok) {
        setEvent({ 
          ...event, 
          joined: true, 
          joiners: [...event.joiners, { id: '', userId, user: { name: null, email: '' } }],
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
            
            <h1>{event.title}</h1>
            <p className={styles.author}>by {event.userName || 'Unknown'}</p>
            {event.planTitle && (
              <p className={styles.planRef}>From: {event.planTitle}</p>
            )}
            
            {event.description && (
              <p className={styles.description}>{event.description}</p>
            )}

            <div className={styles.locationSection}>
              <h3>📍 Location</h3>
              <p className={styles.locationType}>{event.location || 'Not specified'}</p>
              {event.locationDetails && (
                <p className={styles.locationDetails}>{event.locationDetails}</p>
              )}
            </div>

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
              {!isOwner && (
                <>
                  {event.maxJoiners === 0 || joinerCount < event.maxJoiners ? (
                    <button
                      onClick={event.joined ? handleLeave : handleJoin}
                      disabled={joining}
                      className={event.joined ? styles.leaveBtn : styles.joinBtn}
                    >
                      {joining ? 'Processing...' : event.joined ? 'Leave Event' : (event.isTicketed ? 'Get Tickets' : 'RSVP Free')}
                    </button>
                  ) : (
                    <span className={styles.fullBadge}>Event is Full</span>
                  )}
                </>
              )}
            </div>
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
          </div>

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
                      <span className={styles.joinerName}>
                        {j.user.name || j.user.email || `User ${i + 1}`}
                      </span>
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
                  <span key={`${j.id}-${i}`} className={styles.joinerBadge}>
                    {j.user.name || j.user.email || `User ${i + 1}`}
                  </span>
                ))}
                {joinerCount > 10 && (
                  <span className={styles.joinerBadge}>
                    +{joinerCount - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PublicEventPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <EventDetailContent />
    </Suspense>
  )
}