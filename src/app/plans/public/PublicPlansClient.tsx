'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import styles from '../page.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface PlanEvent {
  id: string
  title: string
  eventDate: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  joiners: { userId: string }[]
}

interface PlanRequest {
  id: string
  title: string
  category: string
  budget: number | null
}

interface Plan {
  id: string
  title: string
  description: string | null
  category: string | null
  goals: string | null
  mileposts: string | null
  status: string
  published: boolean
  pinned: boolean
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; image: string | null }
  _count: { requests: number; joiners: number }
  events: PlanEvent[]
  requests: PlanRequest[]
}

interface PublicPlansClientProps {
  initialPlans: Plan[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived'
}

const STATUS_ICONS: Record<string, string> = {
  DRAFT: '📝',
  ACTIVE: '🚀',
  COMPLETED: '✅',
  ARCHIVED: '📦'
}

const CATEGORIES = [
  'TECHNOLOGY',
  'CREATIVE',
  'EDUCATION',
  'ENVIRONMENT',
  'SOCIAL',
  'BUSINESS',
  'HEALTH',
  'ENTERTAINMENT',
  'SPORTS',
  'OTHER'
]

type SortOption = 'newest' | 'oldest' | 'mostActive' | 'mostPopular'
type ViewMode = 'grid' | 'map'

export default function PublicPlansClient({ initialPlans }: PublicPlansClientProps) {
  const { warning } = useToast()
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')
  const [category, setCategory] = useState<string>('ALL')
  const [showPinned, setShowPinned] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [nearbyMode, setNearbyMode] = useState<'ALL' | 'NEARBY'>('ALL')
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number; radius: number} | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)

  // Haversine formula to calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  // Load user location when switching to nearby mode
  const handleNearbyToggle = async (mode: 'ALL' | 'NEARBY') => {
    if (mode === 'NEARBY' && !userLocation) {
      setLoadingLocation(true)
      try {
        // Fetch user's primary location
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const user = await res.json()
          if (user.latitude && user.longitude) {
            setUserLocation({
              lat: user.latitude,
              lng: user.longitude,
              radius: user.searchRadius || 50
            })
          } else {
            warning('Please set your location in your profile to use nearby filtering')
            return
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingLocation(false)
      }
    }
    setNearbyMode(mode)
  }

  const filteredPlans = useMemo(() => {
    let result = [...initialPlans]

    if (filter !== 'ALL') {
      result = result.filter(p => p.status === filter)
    }

    if (category !== 'ALL') {
      result = result.filter(p => p.category === category)
    }

    // Filter by nearby distance
    if (nearbyMode === 'NEARBY' && userLocation && userLocation.lat && userLocation.lng) {
      result = result.filter(p => {
        if (!p.latitude || !p.longitude) return false
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          p.latitude,
          p.longitude
        )
        return distance <= userLocation.radius
      })
    }

    if (showPinned !== null) {
      result = result.filter(p => p.pinned === showPinned)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p => 
        p.title.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.goals?.toLowerCase().includes(query)
      )
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'mostActive':
        result.sort((a, b) => b._count.requests - a._count.requests)
        break
      case 'mostPopular':
        result.sort((a, b) => b._count.joiners - a._count.joiners)
        break
    }

    return result
  }, [initialPlans, filter, category, showPinned, searchQuery, sortBy])

  const mapLocations = useMemo(() => {
    const locations: { lat: number; lng: number; title: string; type: 'plan' | 'event' | 'request'; id: string; info: string }[] = []

    filteredPlans.forEach(plan => {
      if (plan.latitude && plan.longitude) {
        locations.push({
          lat: plan.latitude,
          lng: plan.longitude,
          title: plan.title,
          type: 'plan',
          id: plan.id,
          info: plan.location || 'Project Location'
        })
      }

      plan.events.forEach(event => {
        if (event.latitude && event.longitude) {
          locations.push({
            lat: event.latitude,
            lng: event.longitude,
            title: event.title,
            type: 'event',
            id: plan.id,
            info: `${event.location || 'Event'} - ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'TBD'}`
          })
        }
      })

      plan.requests.forEach(req => {
        if (!locations.find(l => l.title === req.title && l.type === 'request')) {
          locations.push({
            lat: 0,
            lng: 0,
            title: req.title,
            type: 'request',
            id: plan.id,
            info: `${req.category} - ${req.budget ? `$${req.budget}` : 'Open budget'}`
          })
        }
      })
    })

    return locations.filter(l => l.lat !== 0 || l.lng !== 0)
  }, [filteredPlans])

  const defaultCenter: [number, number] = mapLocations.length > 0 
    ? [mapLocations[0].lat, mapLocations[0].lng]
    : [34.8697, -111.7610]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.publicHeader}>
        <h1>Explore Projects</h1>
        <p className={styles.publicSubtitle}>
          Discover amazing projects from our community. Get inspired, join forces, or contribute to ongoing work.
        </p>
        
        <div className={styles.searchBar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search projects by title, description, or goals..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${filter === 'ALL' ? styles.active : ''}`}
            onClick={() => setFilter('ALL')}
          >
            🌟 All ({initialPlans.length})
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'ACTIVE' ? styles.active : ''}`}
            onClick={() => setFilter('ACTIVE')}
          >
            🚀 Active ({initialPlans.filter(p => p.status === 'ACTIVE').length})
          </button>
          <button 
            className={`${styles.filterBtn} ${filter === 'COMPLETED' ? styles.active : ''}`}
            onClick={() => setFilter('COMPLETED')}
          >
            ✅ Completed ({initialPlans.filter(p => p.status === 'COMPLETED').length})
          </button>
        </div>

        <select 
          className={styles.filterSelect}
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <div className={styles.filters}>
          <button 
            className={`${styles.filterBtn} ${showPinned === true ? styles.active : ''}`}
            onClick={() => setShowPinned(showPinned === true ? null : true)}
          >
            📌 Featured
          </button>
          <button 
            className={`${styles.filterBtn} ${nearbyMode === 'NEARBY' ? styles.active : ''}`}
            onClick={() => handleNearbyToggle(nearbyMode === 'NEARBY' ? 'ALL' : 'NEARBY')}
            disabled={loadingLocation}
          >
            {loadingLocation ? '⏳' : '📍'} {nearbyMode === 'NEARBY' ? 'Nearby' : 'All'}
          </button>
        </div>

        <select 
          className={styles.sortSelect}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortOption)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="mostActive">Most Active</option>
          <option value="mostPopular">Most Popular</option>
        </select>

        <div className={styles.viewToggle}>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ⊞ Grid
          </button>
          <button 
            className={`${styles.viewBtn} ${viewMode === 'map' ? styles.active : ''}`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Map
          </button>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filteredPlans.length} {filteredPlans.length === 1 ? 'project' : 'projects'}
        {searchQuery && ` matching "${searchQuery}"`}
        {filter !== 'ALL' && ` (${STATUS_LABELS[filter].toLowerCase()})`}
        {category !== 'ALL' && ` in ${category.toLowerCase()}`}
      </div>

      {viewMode === 'map' ? (
        <div className={styles.mapContainer}>
          <MapContainer center={defaultCenter} zoom={4} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapLocations.map((loc, i) => (
              <Marker key={`${loc.id}-${i}`} position={[loc.lat, loc.lng]}>
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <strong>{loc.title}</strong>
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {loc.type === 'plan' && '📍 Project'}
                      {loc.type === 'event' && '📅 Event'}
                      {loc.type === 'request' && '📝 Request'}
                    </span>
                    <br />
                    <span style={{ fontSize: '11px' }}>{loc.info}</span>
                    <br />
                    <Link href={`/plans/${loc.id}`} style={{ color: '#00d9ff', fontSize: '12px' }}>
                      View Project →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {mapLocations.length === 0 && (
            <div className={styles.mapEmpty}>
              <p>No locations to display. Add location to your projects to see them on the map.</p>
            </div>
          )}
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3>No projects found</h3>
          <p>Try adjusting your search or filters</p>
          <span>Clear filters to see all projects</span>
        </div>
      ) : (
        <div className={styles.publicGrid}>
          {filteredPlans.map((plan, index) => (
            <div 
              key={plan.id} 
              className={`${styles.publicCard} ${plan.pinned ? styles.pinnedCard : ''}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {plan.pinned && (
                <div className={styles.pinnedBanner}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                  </svg>
                  Featured
                </div>
              )}
              
              <div className={styles.publicCardHeader}>
                <span className={`${styles.statusBadge} ${styles[plan.status.toLowerCase()]}`}>
                  {STATUS_ICONS[plan.status]} {STATUS_LABELS[plan.status]}
                </span>
                {plan.category && (
                  <span className={styles.categoryBadge}>{plan.category}</span>
                )}
                <div className={styles.publicStats}>
                  <span title="Requests">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    {plan._count.requests}
                  </span>
                  <span title="Members">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    {plan._count.joiners}
                  </span>
                </div>
              </div>
              
              <h3 className={styles.publicCardTitle}>{plan.title}</h3>
              
              {plan.description && (
                <p className={styles.publicCardDesc}>{plan.description}</p>
              )}
              
              {plan.goals && (
                <div className={styles.publicGoals}>
                  <strong>Goals</strong>
                  <ul>
                    {plan.goals.split('\n').filter(g => g.trim()).slice(0, 3).map((goal, i) => (
                      <li key={i}>{goal.replace(/^[-•]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className={styles.publicCardFooter}>
                <div className={styles.publicAuthor}>
                  <div className={styles.authorAvatar}>
                    {plan.user.image ? (
                      <Image src={plan.user.image} alt={plan.user.name || 'User'} fill sizes="32px" />
                    ) : (
                      <span>{(plan.user.name?.[0] || 'U').toUpperCase()}</span>
                    )}
                  </div>
                  <div className={styles.authorInfo}>
                    <Link href={getUserProfileUrl(plan.user)} className={styles.authorName}>
                      {plan.user.name || 'Anonymous'}
                    </Link>
                    <span className={styles.authorDate}>
                      {formatDate(plan.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.quickActions}>
                <Link href={getUserProfileUrl(plan.user)} className={styles.quickActionBtn}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Creator
                </Link>
                <Link href={`/plans/${plan.id}`} className={styles.quickActionBtn} style={{ background: 'rgba(0, 217, 255, 0.1)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View Details
                </Link>
              </div>
              
              <Link href={`/plans/${plan.id}`} className={styles.viewProjectBtn}>
                Open Project →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
