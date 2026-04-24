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
  user: { name: string | null; email: string }
}

interface Event {
  id: string
  title: string
  description: string | null
  eventCategory: string | null
  eventDate: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number
  currency: string
  planId: string
  planTitle: string
  userId: string
  userName: string | null
  joiners: Joiner[]
  joined?: boolean
}

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
    fetch('/api/public/events')
      .then(res => {
        if (!res.ok) {
          return res.json().catch(() => ({ error: 'Failed to fetch events' })).then(data => {
            throw new Error(data.error || 'Request failed')
          })
        }
        return res.json()
      })
      .then(data => {
        const foundEvent = data.find((e: Event) => e.id === params.id)
        if (foundEvent) {
          setEvent(foundEvent)
        }
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
      const res = await fetch(`/api/plans/${event.planId}/events/${event.id}/join`, { method: 'POST' })
      if (res.ok) {
        setEvent({ ...event, joined: true, joiners: [...event.joiners, { id: userId, userId, user: { name: null, email: '' } }] })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = async () => {
    if (!userId || !event) return
    setJoining(true)
    try {
      const res = await fetch(`/api/plans/${event.planId}/events/${event.id}/join`, { method: 'DELETE' })
      if (res.ok) {
        setEvent({ ...event, joined: false, joiners: event.joiners.filter(j => j.userId !== userId) })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setJoining(false)
    }
  }

  const handleBulkMessage = async () => {
    if (!bulkMessage.trim() || !event) return
    
    setSendingBulk(true)
    setBulkSuccess('')
    
    try {
      const res = await fetch(`/api/plans/${event.planId}/events/${event.id}/bulk-message`, {
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
  if (!event) return <div className={styles.error}>Event not found</div>

  const isOwner = userId === event.userId
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
            <p className={styles.planRef}>From plan: {event.planTitle}</p>
            
            {event.description && (
              <p className={styles.description}>{event.description}</p>
            )}

            <div className={styles.locationSection}>
              <h3>📍 Location</h3>
              <p className={styles.locationType}>Type: {event.location}</p>
              {event.locationDetails && (
                <p className={styles.locationDetails}>{event.locationDetails}</p>
              )}
            </div>

            {event.latitude && event.longitude && (
              <div className={styles.mapSection}>
                <h3>🗺️ Event Location</h3>
                <div className={styles.mapContainer}>
                  <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
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
              {event.maxJoiners === 0 || event.joiners.length < event.maxJoiners ? (
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
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.statsCard}>
            <h3>Event Stats</h3>
            <div className={styles.stat}>
              <span>👥 Attendees</span>
              <span>{event.joiners.length} {event.maxJoiners > 0 ? `/ ${event.maxJoiners}` : ''}</span>
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

          {isOwner && event.joiners.length > 0 && (
            <div className={styles.joinersCard}>
              <button 
                className={styles.ownerToggle}
                onClick={() => setShowJoiners(!showJoiners)}
              >
                <h3>👥 Attendees ({event.joiners.length})</h3>
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

          {!isOwner && event.joiners.length > 0 && (
            <div className={styles.joinersCard}>
              <h3>Joined Users ({event.joiners.length})</h3>
              <div className={styles.joinerList}>
                {event.joiners.slice(0, 10).map((j, i) => (
                  <span key={`${j.id}-${i}`} className={styles.joinerBadge}>
                    {j.user.name || j.user.email || `User ${i + 1}`}
                  </span>
                ))}
                {event.joiners.length > 10 && (
                  <span className={styles.joinerBadge}>
                    +{event.joiners.length - 10} more
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
