'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { useToast } from '@/context/ToastContext'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import type { Event } from '@/types/event'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })
const QRCodeModal = dynamic(() => import('@/components/QRCodeModal').then(mod => mod.QRCodeModal), { ssr: false })

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



export default function EventsPage() {
  const { warning, info, error: toastError } = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [category, setCategory] = useState('ALL')
  const [location, setLocation] = useState('ALL')
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState('25')
  const [sortBy, setSortBy] = useState('date')
  const [dateRange, setDateRange] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [mapExpanded, setMapExpanded] = useState(false)
  const [qrOpen, setQrOpen] = useState<string | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const { location: passportLocation } = usePassportLocation()

  const geocodeZipCode = useCallback(async () => {
    if (!zipCode.trim()) {
      setUserLocation(null)
      return
    }
    setGeocodingLoading(true)
    try {
      const result = await geocodeLocation(zipCode)
      if (result) {
        setUserLocation({ lat: result.latitude, lon: result.longitude })
      } else {
        warning('Could not find location for that zip code')
        setUserLocation(null)
      }
    } catch (err) {
      console.error(err)
      warning('Could not find location for that zip code')
      setUserLocation(null)
    } finally {
      setGeocodingLoading(false)
    }
  }, [zipCode])

  useEffect(() => {
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
        setEvents(data)
        setFilteredEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    
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
    if (passportLocation?.latitude && passportLocation?.longitude && !zipCode) {
      setUserLocation({ lat: passportLocation.latitude, lon: passportLocation.longitude })
      setRadius(String(passportLocation.searchRadius || 25))
    }
  }, [passportLocation])

  const handleJoin = async (eventId: string) => {
    if (!userId) {
      info('Please sign in to join events')
      return
    }
    setJoining(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/join`, { method: 'POST' })
      if (res.ok) {
        const newJoiner = { id: '', userId: userId, user: { name: null, email: '' } }
        setEvents(events.map(e => e.id === eventId ? { ...e, joiners: [...(e.joiners || []), newJoiner], joined: true } : e))
        setFilteredEvents(filteredEvents.map(e => e.id === eventId ? { ...e, joiners: [...(e.joiners || []), newJoiner], joined: true } : e))
        if (selectedEvent?.id === eventId) {
          setSelectedEvent({ ...selectedEvent, joiners: [...(selectedEvent.joiners || []), newJoiner], joined: true })
        }
      }
    } catch (err) {
      console.error(err)
      toastError('Failed to join event')
    } finally {
      setJoining(null)
    }
  }

  const handleLeave = async (eventId: string) => {
    if (!userId) return
    setJoining(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/join`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(events.map(e => e.id === eventId ? { ...e, joiners: (e.joiners || []).filter(j => j.userId !== userId), joined: false } : e))
        setFilteredEvents(filteredEvents.map(e => e.id === eventId ? { ...e, joiners: (e.joiners || []).filter(j => j.userId !== userId), joined: false } : e))
        if (selectedEvent?.id === eventId) {
          setSelectedEvent({ ...selectedEvent, joiners: (selectedEvent.joiners || []).filter(j => j.userId !== userId), joined: false })
        }
      }
    } catch (err) {
      console.error(err)
      toastError('Failed to leave event')
    } finally {
      setJoining(null)
    }
  }

  useEffect(() => {
    let result = events

    if (category !== 'ALL') {
      result = result.filter(e => e.eventCategory === category)
    }
    if (location !== 'ALL') {
      result = result.filter(e => e.location === location)
    }
    
    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(e => {
        if (e.latitude == null || e.longitude == null) return false
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          e.latitude,
          e.longitude
        )
        return distance <= radiusMiles
      })
    }

    const now = new Date()
    let rangeStart: Date | null = null
    let rangeEnd: Date | null = null

    if (dateRange) {
      switch (dateRange) {
        case 'week':
          rangeStart = now
          rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          rangeStart = now
          rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          break
        case '2months':
          rangeStart = now
          rangeEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
          break
        case '3months':
          rangeStart = now
          rangeEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          break
        case '6months':
          rangeStart = now
          rangeEnd = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
          break
        case 'custom':
          if (startDate) rangeStart = new Date(startDate)
          if (endDate) rangeEnd = new Date(endDate)
          break
      }
    }

    if (rangeStart || rangeEnd) {
      result = result.filter(e => {
        if (!e.eventDate) return false
        const eventDate = new Date(e.eventDate)
        if (rangeStart && eventDate < rangeStart) return false
        if (rangeEnd && eventDate > rangeEnd) return false
        return true
      })
    }
    
    if (sortBy === 'date') {
      result = [...result].sort((a, b) => {
        if (!a.eventDate) return 1
        if (!b.eventDate) return -1
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      })
    } else if (sortBy === 'date-desc') {
      result = [...result].sort((a, b) => {
        if (!a.eventDate) return 1
        if (!b.eventDate) return -1
        return new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
      })
    }
    
    setFilteredEvents(result)
  }, [category, location, events, userLocation, radius, sortBy, dateRange, startDate, endDate])

  const categories = [...new Set(events.map(e => e.eventCategory).filter(Boolean))]
  const locations = [...new Set(events.map(e => e.location).filter(Boolean))]

  const eventsWithCoords = filteredEvents.filter(e => e.latitude != null && e.longitude != null)
  
  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lon]
    }
    if (eventsWithCoords.length > 0) {
      if (eventsWithCoords.length === 1) {
        return [eventsWithCoords[0].latitude!, eventsWithCoords[0].longitude!]
      }
      const lats = eventsWithCoords.map(e => e.latitude!)
      const lons = eventsWithCoords.map(e => e.longitude!)
      const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const avgLon = (Math.min(...lons) + Math.max(...lons)) / 2
      return [avgLat, avgLon]
    }
    return [34.8697, -111.7610]
  }

  const getMapZoom = (): number => {
    if (userLocation || eventsWithCoords.length === 0) {
      return 10
    }
    if (eventsWithCoords.length === 1) {
      return 13
    }
    const lats = eventsWithCoords.map(e => e.latitude!)
    const lons = eventsWithCoords.map(e => e.longitude!)
    const latDiff = Math.max(...lats) - Math.min(...lats)
    const lonDiff = Math.max(...lons) - Math.min(...lons)
    const maxDiff = Math.max(latDiff, lonDiff)
    
    if (maxDiff < 0.1) return 13
    if (maxDiff < 0.5) return 11
    if (maxDiff < 1) return 10
    if (maxDiff < 5) return 8
    if (maxDiff < 10) return 6
    return 4
  }

  const center = getMapCenter()
  const zoom = getMapZoom()

  useEffect(() => {
    if (mapRef.current && viewMode !== 'calendar') {
      mapRef.current.setView(center, zoom, { animate: true })
    }
  }, [center, zoom, viewMode])

  const clearFilters = () => {
    setCategory('ALL')
    setLocation('ALL')
    setSortBy('date')
    setDateRange('')
    setStartDate('')
    setEndDate('')
    setZipCode('')
    setRadius('25')
    setUserLocation(null)
  }

  const hasActiveFilters = category !== 'ALL' || location !== 'ALL' || sortBy !== 'date' || dateRange || zipCode

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Events</h1>
            <p className={styles.subtitle}>Discover and join events near you</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {userId && (
              <Link href="/events/new" className="btn-primary">
                Create Event
              </Link>
            )}
            <div className={styles.viewToggle}>
              <button className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`} onClick={() => setViewMode('list')} aria-label="List view">List</button>
              <button className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.active : ''}`} onClick={() => setViewMode('calendar')} aria-label="Calendar view">Calendar</button>
              <button className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.active : ''}`} onClick={() => setViewMode('map')} aria-label="Map view">Map</button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainLayout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </h2>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Categories</option>
              {categories.map(cat => (<option key={cat} value={cat!}>{cat}</option>))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Location</label>
            <select value={location} onChange={e => setLocation(e.target.value)} className={styles.filterSelect}>
              <option value="ALL">All Locations</option>
              {locations.map(loc => (<option key={loc} value={loc!}>{loc}</option>))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Sort</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.filterSelect}>
              <option value="date">Date (Soonest)</option>
              <option value="date-desc">Date (Latest)</option>
            </select>
          </div>

          <div className={styles.filterDivider} />

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date Range</label>
            <select value={dateRange} onChange={e => {
              setDateRange(e.target.value)
              if (e.target.value !== 'custom') {
                setStartDate('')
                setEndDate('')
              }
            }} className={styles.filterSelect}>
              <option value="">Any Time</option>
              <option value="week">Next 7 Days</option>
              <option value="month">Next 30 Days</option>
              <option value="2months">Next 2 Months</option>
              <option value="3months">Next 3 Months</option>
              <option value="6months">Next 6 Months</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={styles.filterInput} />
            </div>
          )}
          {dateRange === 'custom' && (
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>End Date</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={styles.filterInput} />
            </div>
          )}

          <div className={styles.filterDivider} />

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Distance from ZIP</label>
            <div className={styles.zipFilter}>
              <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="Enter ZIP code" className={styles.zipInput} onKeyDown={e => e.key === 'Enter' && geocodeZipCode()} />
              <div className={styles.zipRow}>
                <select value={radius} onChange={e => setRadius(e.target.value)} className={styles.filterSelect} disabled={!userLocation && !zipCode}>
                  <option value="5">5 mi</option>
                  <option value="10">10 mi</option>
                  <option value="25">25 mi</option>
                  <option value="50">50 mi</option>
                  <option value="100">100 mi</option>
                </select>
                <button onClick={geocodeZipCode} className={styles.zipBtn} disabled={geocodingLoading || !zipCode.trim()}>
                  {geocodingLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>
            {passportLocation?.latitude && passportLocation?.longitude && (
              <button
                onClick={() => {
                  setUserLocation({ lat: passportLocation.latitude!, lon: passportLocation.longitude! })
                  setRadius(String(passportLocation.searchRadius || 25))
                  setZipCode('')
                }}
                className={styles.zipBtn}
                style={{ marginTop: '8px', width: '100%' }}
              >
                📍 Near Me
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className={styles.clearBtn}>
              Clear All Filters
            </button>
          )}
        </aside>

        <main className={styles.content}>
          {viewMode === 'calendar' ? (
            <div className={styles.calendarView}>
              <div className={styles.calendarHeader}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNavBtn} aria-label="Previous month">←</button>
                <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNavBtn} aria-label="Next month">→</button>
              </div>
              <div className={styles.calendarGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className={styles.calendarDayHeader}>{day}</div>
                ))}
                {getCalendarDays()}
              </div>
            </div>
          ) : viewMode === 'map' ? (
            <div className={styles.fullMapView}>
              <div className={styles.fullMapHeader}>
                <button className={styles.backToListBtn} onClick={() => setViewMode('list')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back to List
                </button>
                <span className={styles.fullMapCount}>{eventsWithCoords.length} events on map</span>
              </div>
              <div style={{ height: '600px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {eventsWithCoords.map(event => (
                    <Marker key={event.id} position={[event.latitude!, event.longitude!]} eventHandlers={{ click: () => setSelectedEvent(event) }}>
                      <Popup>
                        <div className={styles.mapPopupContent}>
                          <h4>{event.title}</h4>
                          {event.eventCategory && (<span className={`badge badge-${event.eventCategory.toLowerCase()}`}>{event.eventCategory}</span>)}
                          {event.eventDate && (<p className={styles.popupDetail}>📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>)}
                          {event.location && <p className={styles.popupDetail}>📍 {event.location}</p>}
                          {event.locationDetails && <p className={styles.popupDetailSmall}>{event.locationDetails}</p>}
                          <p className={styles.popupDetail}>👥 {(event.joiners || []).length}{event.maxJoiners > 0 ? `/${event.maxJoiners}` : ''} joined</p>
                          <div className={styles.popupActions}>
                            {event.maxJoiners === 0 || (event.joiners || []).length < event.maxJoiners ? (
                              <button onClick={(e) => { e.stopPropagation(); if (event.joined) { handleLeave(event.id) } else { handleJoin(event.id) } }} disabled={joining === event.id} className={event.joined ? "btn-secondary" : "btn-primary"}>
                                {joining === event.id ? '...' : event.joined ? 'Leave' : 'Join Event'}
                              </button>
                            ) : (<span className="badge badge-full">Event Full</span>)}
                            <Link href={`/events/${event.id}`} className={styles.popupLink}>View Details →</Link>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.resultsHeader}>
                <span className={styles.resultsCount}>
                  <strong>{filteredEvents.length}</strong> {filteredEvents.length === 1 ? 'event' : 'events'} found
                </span>
              </div>

              <div className={styles.gridView}>
                {loading ? (
                  <div className={styles.loading}>Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className={styles.emptyState}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="M21 21l-4.35-4.35"/>
                      <path d="M8 11h6"/>
                    </svg>
                    <h3>No events found</h3>
                    <p>Try adjusting your filters or create a new event.</p>
                    {userId && (<Link href="/events/new" className="btn-primary">Create Event</Link>)}
                    <button onClick={clearFilters} className={styles.clearBtn} style={{ marginTop: '16px' }}>Clear Filters</button>
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <div key={event.id} className={`${styles.eventCard} ${selectedEvent?.id === event.id ? styles.selected : ''}`} onClick={() => { setSelectedEvent(event); if (event.latitude && event.longitude && mapRef.current) { mapRef.current.setView([event.latitude, event.longitude], 15, { animate: true }) } }}>
                      {event.imageUrl && (
                        <div className={styles.eventImageWrapper}>
                          <img src={event.imageUrl} alt={event.title} className={styles.eventCardImage} />
                        </div>
                      )}
                      <div className={styles.eventHeader}>
                        <span className={`badge badge-${event.eventCategory?.toLowerCase()}`}>{event.eventCategory}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {event.acceptsDonations && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setQrOpen(event.id) }}
                              className={styles.donationBadge}
                              title={`Donate ${event.donationCurrency || 'ETH'}`}
                            >
                              💰 Donate
                            </button>
                          )}
                          {event.eventDate && (<span className={styles.eventDate}>{new Date(event.eventDate).toLocaleDateString()}</span>)}
                        </div>
                      </div>
                      <h3>{event.title}</h3>
                      {event.description && <p className={styles.eventDesc}>{event.description}</p>}
                      <div className={styles.eventMeta}>
                        <span>📍 {event.location}</span>
                        {event.maxJoiners > 0 && (<span>👥 {(event.joiners || []).length}/{event.maxJoiners} joined</span>)}
                        {event.userName && <span>👤 {event.userName}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {event.maxJoiners === 0 || (event.joiners || []).length < event.maxJoiners ? (
                          <button onClick={(e) => { e.stopPropagation(); if (event.joined) { handleLeave(event.id) } else { handleJoin(event.id) } }} disabled={joining === event.id} className={event.joined ? "btn-secondary" : "btn-primary"} style={{ flex: 1 }}>
                            {joining === event.id ? '...' : event.joined ? 'Leave' : 'Join Event'}
                          </button>
                        ) : (<span className="badge badge-full" style={{ flex: 1, textAlign: 'center', padding: '8px' }}>Event Full</span>)}
                        <Link href={`/events/${event.id}`} className={styles.viewBtn} onClick={e => e.stopPropagation()}>View Details</Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </main>

        {qrOpen && (() => {
          const ev = events.find(e => e.id === qrOpen)
          if (!ev) return null
          return (
            <QRCodeModal isOpen={true} onClose={() => setQrOpen(null)} currency={ev.donationCurrency || 'ETH'} address={ev.donationAddress || ''} />
          )
        })()}
      </div>
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
      const eventsOnDay = filteredEvents.filter(e => {
        if (!e.eventDate) return false
        const eventDate = new Date(e.eventDate).toISOString().split('T')[0]
        return eventDate === dateStr
      })
      
      days.push(
        <div key={day} className={`${styles.calendarCell} ${eventsOnDay.length > 0 ? styles.hasEvents : ''}`}>
          <span className={styles.calendarDayNumber}>{day}</span>
          <div className={styles.calendarEvents}>
            {eventsOnDay.slice(0, 3).map(event => (
              <Link key={event.id} href={`/events/${event.id}`} className={styles.calendarEventItem}>
                <span className={styles.calendarEventIcon}>📅</span>
                <span className={styles.calendarEventTitle}>{event.title}</span>
              </Link>
            ))}
            {eventsOnDay.length > 3 && (<span className={styles.moreEvents}>+{eventsOnDay.length - 3} more</span>)}
          </div>
        </div>
      )
    }
    
    return days
  }
}
