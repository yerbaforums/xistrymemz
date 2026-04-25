'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { useToast } from '@/context/ToastContext'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  L = require('leaflet')
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface Joiner {
  id: string
  user: { name: string | null; email: string }
}

interface Plan {
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
  planId: string
  planTitle: string
  userName: string | null
  joiners: Joiner[]
  _count?: { joiners: number }
  joined?: boolean
}

export default function EventsPage() {
  const { warning, info, error: toastError } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([])
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
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [joining, setJoining] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())

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
        setPlans(data)
        setFilteredPlans(data)
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

  const handleJoin = async (eventId: string) => {
    if (!userId) {
      info('Please sign in to join events')
      return
    }
    setJoining(eventId)
    try {
      const res = await fetch(`/api/plans/${selectedPlan?.planId}/events/${eventId}/join`, { method: 'POST' })
      if (res.ok) {
        const newJoiner = { id: '', user: { name: null, email: '' } }
        setPlans(plans.map(p => p.id === eventId ? { ...p, joiners: [...(p.joiners || []), newJoiner], joined: true } : p))
        setFilteredPlans(filteredPlans.map(p => p.id === eventId ? { ...p, joiners: [...(p.joiners || []), newJoiner], joined: true } : p))
        if (selectedPlan?.id === eventId) {
          setSelectedPlan({ ...selectedPlan, joiners: [...(selectedPlan.joiners || []), newJoiner], joined: true })
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
      const res = await fetch(`/api/plans/${selectedPlan?.planId}/events/${eventId}/join`, { method: 'DELETE' })
      if (res.ok) {
        setPlans(plans.map(p => p.id === eventId ? { ...p, joiners: (p.joiners || []).slice(0, -1), joined: false } : p))
        setFilteredPlans(filteredPlans.map(p => p.id === eventId ? { ...p, joiners: (p.joiners || []).slice(0, -1), joined: false } : p))
        if (selectedPlan?.id === eventId) {
          setSelectedPlan({ ...selectedPlan, joiners: (selectedPlan.joiners || []).slice(0, -1), joined: false })
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
    let result = plans
    if (category !== 'ALL') {
      result = result.filter(p => p.eventCategory === category)
    }
    if (location !== 'ALL') {
      result = result.filter(p => p.location === location)
    }
    
    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(p => {
        if (p.latitude == null || p.longitude == null) return false
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lon,
          p.latitude,
          p.longitude
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
      result = result.filter(p => {
        if (!p.eventDate) return false
        const eventDate = new Date(p.eventDate)
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
    
    setFilteredPlans(result)
  }, [category, location, plans, userLocation, radius, sortBy, dateRange, startDate, endDate])

  const categories = [...new Set(plans.map(p => p.eventCategory).filter(Boolean))]
  const locations = [...new Set(plans.map(p => p.location).filter(Boolean))]

  const plansWithCoords = filteredPlans.filter(p => p.latitude != null && p.longitude != null)
  
  const getMapCenter = (): [number, number] => {
    if (userLocation) {
      return [userLocation.lat, userLocation.lon]
    }
    if (plansWithCoords.length > 0) {
      if (plansWithCoords.length === 1) {
        return [plansWithCoords[0].latitude!, plansWithCoords[0].longitude!]
      }
      const lats = plansWithCoords.map(p => p.latitude!)
      const lons = plansWithCoords.map(p => p.longitude!)
      const avgLat = (Math.min(...lats) + Math.max(...lats)) / 2
      const avgLon = (Math.min(...lons) + Math.max(...lons)) / 2
      return [avgLat, avgLon]
    }
    return [34.8697, -111.7610]
  }

  const getMapZoom = (): number => {
    if (userLocation || plansWithCoords.length === 0) {
      return 10
    }
    if (plansWithCoords.length === 1) {
      return 13
    }
    const lats = plansWithCoords.map(p => p.latitude!)
    const lons = plansWithCoords.map(p => p.longitude!)
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
              <Link href="/dashboard?tab=events" className="btn-primary">
                Create Event
              </Link>
            )}
            <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              List
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewMode('calendar')}
              aria-label="Calendar view"
            >
              Calendar
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'map' ? styles.active : ''}`}
              onClick={() => setViewMode('map')}
              aria-label="Map view"
            >
              Map
            </button>
          </div>
        </div>
      </div>
    </div>

      <div className={styles.filters}>
        <select value={category} onChange={e => setCategory(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>
        <select value={location} onChange={e => setLocation(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Locations</option>
          {locations.map(loc => (
            <option key={loc} value={loc!}>{loc}</option>
          ))}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={styles.filterSelect}>
          <option value="date">Date (Soonest)</option>
          <option value="date-desc">Date (Latest)</option>
        </select>
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
        {dateRange === 'custom' && (
          <div className={styles.dateRangeInputs}>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={styles.dateInput}
            />
            <span>to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        )}
        <div className={styles.zipFilter}>
          <input
            type="text"
            value={zipCode}
            onChange={e => setZipCode(e.target.value)}
            placeholder="Zip code"
            className={styles.zipInput}
            onKeyDown={e => e.key === 'Enter' && geocodeZipCode()}
          />
          <select 
            value={radius} 
            onChange={e => setRadius(e.target.value)} 
            className={styles.radiusSelect}
            disabled={!userLocation}
          >
            <option value="5">5 mi</option>
            <option value="10">10 mi</option>
            <option value="25">25 mi</option>
            <option value="50">50 mi</option>
            <option value="100">100 mi</option>
          </select>
          <button 
            onClick={geocodeZipCode} 
            className={styles.zipBtn}
            disabled={geocodingLoading}
          >
            {geocodingLoading ? '...' : 'Go'}
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className={styles.calendarView}>
          <div className={styles.calendarHeader}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNavBtn} aria-label="Previous month">
              ←
            </button>
            <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNavBtn} aria-label="Next month">
              →
            </button>
          </div>
          <div className={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.calendarDayHeader}>{day}</div>
            ))}
            {getCalendarDays()}
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
          <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {plansWithCoords.map(plan => (
              <Marker 
                key={plan.id} 
                position={[plan.latitude!, plan.longitude!]}
                eventHandlers={{
                  click: () => setSelectedPlan(plan),
                }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong>{plan.title}</strong>
                    <br />
                    {plan.eventDate && <span>{new Date(plan.eventDate).toLocaleDateString()}</span>}
                    <br />
                    {plan.location}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div className={styles.mapSection} style={{ width: '350px', height: '350px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 1 }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {plansWithCoords.map(plan => (
                <Marker 
                  key={plan.id} 
                  position={[plan.latitude!, plan.longitude!]}
                  eventHandlers={{
                    click: () => setSelectedPlan(plan),
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <strong style={{ fontSize: '14px' }}>{plan.title}</strong>
                      <br />
                      {plan.eventCategory && <span className={`badge badge-${plan.eventCategory.toLowerCase()}`}>{plan.eventCategory}</span>}
                      {plan.eventDate && (
                        <p style={{ margin: '8px 0', fontSize: '12px' }}>
                          📅 {new Date(plan.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                      {plan.location && <p style={{ margin: '4px 0', fontSize: '12px' }}>📍 {plan.location}</p>}
                      {plan.locationDetails && <p style={{ margin: '4px 0', fontSize: '11px', color: '#666' }}>{plan.locationDetails}</p>}
                      <p style={{ margin: '8px 0', fontSize: '12px' }}>👥 {(plan.joiners || []).length}{plan.maxJoiners > 0 ? `/${plan.maxJoiners}` : ''} joined</p>
                      {plan.maxJoiners === 0 || (plan.joiners || []).length < plan.maxJoiners ? (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation()
                            if (plan.joined) { handleLeave(plan.id) } else { handleJoin(plan.id) }
                          }}
                          disabled={joining === plan.id}
                          style={{ marginTop: '8px', padding: '6px 12px', background: plan.joined ? '#666' : '#00d9ff', color: plan.joined ? '#fff' : '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                          {joining === plan.id ? '...' : plan.joined ? 'Leave' : 'Join Event'}
                        </button>
                      ) : (
                        <p style={{ marginTop: '8px', fontSize: '11px', color: '#e53e3e' }}>Event is full</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div className={styles.listSection} style={{ flex: 1 }}>
            {loading ? (
              <div className={styles.loading}>Loading events...</div>
            ) : filteredPlans.length === 0 ? (
              <div className={styles.empty}>
                <p>No events found</p>
                {userId && (
                  <Link href="/dashboard?tab=events" className="btn-primary">
                    Create Event
                  </Link>
                )}
              </div>
            ) : (
              filteredPlans.map(plan => (
                <div 
                  key={plan.id} 
                  className={`${styles.eventCard} ${selectedPlan?.id === plan.id ? styles.selected : ''}`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className={styles.eventHeader}>
                    <span className={`badge badge-${plan.eventCategory?.toLowerCase()}`}>
                      {plan.eventCategory}
                    </span>
                    {plan.eventDate && (
                      <span className={styles.eventDate}>
                        {new Date(plan.eventDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <h3>{plan.title}</h3>
                  {plan.description && <p className={styles.eventDesc}>{plan.description}</p>}
                  <div className={styles.eventMeta}>
                    <span>📍 {plan.location}</span>
                    {plan.maxJoiners > 0 && (
                      <span>👥 {(plan.joiners || []).length}/{plan.maxJoiners} joined</span>
                    )}
                    {plan.userName && <span>👤 {plan.userName}</span>}
                  </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {plan.maxJoiners === 0 || (plan.joiners || []).length < plan.maxJoiners ? (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation()
                          if (plan.joined) { handleLeave(plan.id) } else { handleJoin(plan.id) }
                        }}
                        disabled={joining === plan.id}
                        className={plan.joined ? "btn-secondary" : "btn-primary"}
                        style={{ flex: 1 }}
                      >
                        {joining === plan.id ? '...' : plan.joined ? 'Leave' : 'Join Event'}
                      </button>
                    ) : (
                      <span className="badge badge-full" style={{ flex: 1, textAlign: 'center', padding: '8px' }}>Event Full</span>
                    )}
                    <Link href={`/events/${plan.id}`} className={styles.viewBtn} onClick={e => e.stopPropagation()}>
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
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
      const eventsOnDay = filteredPlans.filter(p => {
        if (!p.eventDate) return false
        const eventDate = new Date(p.eventDate).toISOString().split('T')[0]
        return eventDate === dateStr
      })
      
      days.push(
        <div key={day} className={`${styles.calendarCell} ${eventsOnDay.length > 0 ? styles.hasEvents : ''}`}>
          <span className={styles.calendarDayNumber}>{day}</span>
          <div className={styles.calendarEvents}>
            {eventsOnDay.slice(0, 3).map(event => (
              <Link 
                key={event.id} 
                href={`/events/${event.id}`}
                className={styles.calendarEventItem}
              >
                <span className={styles.calendarEventIcon}>📅</span>
                <span className={styles.calendarEventTitle}>{event.title}</span>
              </Link>
            ))}
            {eventsOnDay.length > 3 && (
              <span className={styles.moreEvents}>+{eventsOnDay.length - 3} more</span>
            )}
          </div>
        </div>
      )
    }
    
    return days
  }
}
