'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { getUserProfileUrl } from '@/lib/utils'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'


interface ProjectEvent {
  id: string
  title: string
  eventDate: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  joiners: { userId: string }[]
}

interface ProjectRequest {
  id: string
  title: string
  category: string
  budget: number | null
}

interface ProjectData {
  id: string
  title: string
  description: string | null
  category: string | null
  goals: string | null
  mileposts: string | null
  images: string | null
  videoUrl: string | null
  needsVolunteers: boolean
  volunteerRoles: string | null
  volunteerDescription: string | null
  lookingForCollaborators: boolean
  status: string
  published: boolean
  pinned: boolean
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  goalAmount: number | null
  currentFunding: number | null
  createdAt: string
  updatedAt: string
  user: { id: string; name: string | null; image: string | null; username: string | null }
  _count: { requests: number; joiners: number }
  events: ProjectEvent[]
  requests: ProjectRequest[]
}

interface PublicProjectsClientProps {
  initialProjects: ProjectData[]
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
  'TECHNOLOGY', 'CREATIVE', 'EDUCATION', 'ENVIRONMENT', 'NATURE',
  'GARDENING', 'COMMUNITY', 'SCIENCE', 'MUSIC', 'FOOD', 'TRAVEL',
  'FASHION', 'PHOTOGRAPHY', 'WRITING', 'GAMING', 'PETS', 'DIY',
  'HEALTH', 'SOCIAL', 'BUSINESS', 'SPORTS', 'ENTERTAINMENT', 'OTHER'
]

const CATEGORY_COLORS: Record<string, string> = {
  TECHNOLOGY: '#00d9ff', CREATIVE: '#ff3366', EDUCATION: '#00ff88',
  ENVIRONMENT: '#22c55e', NATURE: '#16a34a', GARDENING: '#65a30d',
  COMMUNITY: '#f59e0b', SCIENCE: '#8b5cf6', MUSIC: '#ec4899',
  FOOD: '#f97316', TRAVEL: '#14b8a6', FASHION: '#e879f9',
  PHOTOGRAPHY: '#a855f7', WRITING: '#3b82f6', GAMING: '#7c3aed',
  PETS: '#d97706', DIY: '#eab308', HEALTH: '#ef4444',
  SOCIAL: '#f59e0b', BUSINESS: '#8b5cf6', SPORTS: '#f97316',
  ENTERTAINMENT: '#ec4899', OTHER: '#888888'
}

const CATEGORY_ICONS: Record<string, string> = {
  TECHNOLOGY: '💻', CREATIVE: '🎨', EDUCATION: '📚', ENVIRONMENT: '🌿',
  NATURE: '🌲', GARDENING: '🌱', COMMUNITY: '🏘️', SCIENCE: '🔬',
  MUSIC: '🎵', FOOD: '🍽️', TRAVEL: '✈️', FASHION: '👗',
  PHOTOGRAPHY: '📷', WRITING: '✍️', GAMING: '🎮', PETS: '🐾',
  DIY: '🛠️', HEALTH: '❤️',
  SOCIAL: '🤝', BUSINESS: '💼', SPORTS: '⚽',
  ENTERTAINMENT: '🎭', OTHER: '📌'
}

type SortOption = 'newest' | 'oldest' | 'mostActive' | 'mostPopular'
type ViewMode = 'grid' | 'map'
type NearbyMode = 'ALL' | 'NEARBY'

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function PublicProjectsClient({ initialProjects }: PublicProjectsClientProps) {
  const router = useRouter()
  const { warning } = useToast()
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL')
  const [category, setCategory] = useState<string>('ALL')
  const [showPinned, setShowPinned] = useState<boolean | null>(null)
  const [showCollaborators, setShowCollaborators] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [nearbyMode, setNearbyMode] = useState<NearbyMode>('ALL')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; radius: number } | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)

  const handleNearbyToggle = async (mode: NearbyMode) => {
    if (mode === 'NEARBY' && !userLocation) {
      setLoadingLocation(true)
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const me = await res.json()
          const user = me?.data || me
          if (user.latitude && user.longitude) {
            setUserLocation({
              lat: user.latitude,
              lng: user.longitude,
              radius: user.searchRadius || 50
            })
          } else {
            warning('Set your location in profile to use nearby filtering')
            return
          }
        }
      } catch {
        warning('Could not load location')
      } finally {
        setLoadingLocation(false)
      }
    }
    setNearbyMode(mode)
  }

  const filteredProjects = useMemo(() => {
    let result = [...initialProjects]

    if (filter !== 'ALL') {
      result = result.filter(p => p.status === filter)
    }

    if (category !== 'ALL') {
      result = result.filter(p => p.category === category)
    }

    if (showPinned !== null) {
      result = result.filter(p => p.pinned === showPinned)
    }

    if (showCollaborators) {
      result = result.filter(p => p.lookingForCollaborators)
    }

    if (nearbyMode === 'NEARBY' && userLocation) {
      result = result.filter(p => {
        if (!p.latitude || !p.longitude) return false
        const dist = haversineDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
        return dist <= userLocation.radius
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.goals?.toLowerCase().includes(q)
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
  }, [initialProjects, filter, category, showPinned, showCollaborators, searchQuery, sortBy, nearbyMode, userLocation])

  const mapLocations = useMemo(() => {
    const locations: { lat: number; lng: number; title: string; type: string; id: string; info: string }[] = []
    filteredProjects.forEach(plan => {
      if (plan.latitude && plan.longitude) {
        locations.push({ lat: plan.latitude, lng: plan.longitude, title: plan.title, type: 'project', id: plan.id, info: plan.location || 'Project Location' })
      }
      plan.events.forEach(event => {
        if (event.latitude && event.longitude) {
          locations.push({
            lat: event.latitude, lng: event.longitude, title: event.title, type: 'event', id: event.id,
            info: `${event.location || 'Event'} - ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'TBD'}`
          })
        }
      })
    })
    return locations.filter(l => l.lat !== 0 || l.lng !== 0)
  }, [filteredProjects])

  const defaultCenter: [number, number] = mapLocations.length > 0
    ? [mapLocations[0].lat, mapLocations[0].lng]
    : [34.8697, -111.7610]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const parseGoalsList = (goals: string | null): string[] => {
    if (!goals) return []
    const trimmed = goals.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map((g: { text?: string }) => g.text || '').filter(Boolean)
      } catch {}
    }
    return trimmed.split('\n').filter(g => g.trim()).slice(0, 3)
  }

  const nextEvent = (events: ProjectEvent[]) => {
    const upcoming = events
      .filter(e => e.eventDate && new Date(e.eventDate) > new Date())
      .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
    return upcoming[0] || null
  }

  const getProjectDistance = (plan: ProjectData): number | null => {
    if (!userLocation || !plan.latitude || !plan.longitude) return null
    return Math.round(haversineDistance(userLocation.lat, userLocation.lng, plan.latitude, plan.longitude))
  }

  const sidebarContent = (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        <span>Filters</span>
        <button className={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Status</label>
        <div className={styles.filterRadios}>
          {(['ALL', 'ACTIVE', 'COMPLETED'] as const).map(s => (
            <button
              key={s}
              className={`${styles.filterRadio} ${filter === s ? styles.filterRadioActive : ''}`}
              onClick={() => setFilter(s)}
            >
              {s === 'ALL' ? '🌟 All' : `${STATUS_ICONS[s]} ${STATUS_LABELS[s]}`}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Category</label>
        <select className={styles.filterSelect} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="ALL">🌟 All Categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat] || '📌'} {cat.charAt(0) + cat.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Search</label>
        <div className={styles.sidebarSearch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" placeholder="Search projects..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className={styles.sidebarSearchInput}
          />
          {searchQuery && <button className={styles.sidebarClear} onClick={() => setSearchQuery('')}>✕</button>}
        </div>
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Sort By</label>
        <select className={styles.filterSelect} value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
          <option value="newest">🕐 Newest</option>
          <option value="oldest">🕐 Oldest</option>
          <option value="mostActive">📋 Most Active</option>
          <option value="mostPopular">👥 Most Popular</option>
        </select>
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Location</label>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${nearbyMode === 'ALL' ? styles.filterToggleActive : ''}`}
            onClick={() => { setNearbyMode('ALL'); setUserLocation(null) }}
          >
            🌍 Global
          </button>
          <button
            className={`${styles.filterToggle} ${nearbyMode === 'NEARBY' ? styles.filterToggleActive : ''}`}
            onClick={() => handleNearbyToggle(nearbyMode === 'NEARBY' ? 'ALL' : 'NEARBY')}
            disabled={loadingLocation}
          >
            {loadingLocation ? '⏳' : '📍'} Near Me
          </button>
        </div>
        {nearbyMode === 'NEARBY' && userLocation && (
          <span className={styles.locationInfo}>Within {userLocation.radius} miles</span>
        )}
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Features</label>
        <div className={styles.filterToggles}>
          <button
            className={`${styles.filterToggle} ${showPinned === true ? styles.filterToggleActive : ''}`}
            onClick={() => setShowPinned(showPinned === true ? null : true)}
          >
            📌 Featured
          </button>
          <button
            className={`${styles.filterToggle} ${showCollaborators ? styles.filterToggleActive : ''}`}
            onClick={() => setShowCollaborators(!showCollaborators)}
          >
            🤝 Collaborators
          </button>
        </div>
      </div>

      <div className={styles.filterDivider} />

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>View</label>
        <div className={styles.filterViewToggle}>
          <button className={`${styles.filterViewBtn} ${viewMode === 'grid' ? styles.filterViewBtnActive : ''}`} onClick={() => setViewMode('grid')}>⊞ Grid</button>
          <button className={`${styles.filterViewBtn} ${viewMode === 'map' ? styles.filterViewBtnActive : ''}`} onClick={() => setViewMode('map')}>🗺️ Map</button>
        </div>
      </div>

      {(filter !== 'ALL' || category !== 'ALL' || showPinned !== null || searchQuery || nearbyMode !== 'ALL') && (
        <>
          <div className={styles.filterDivider} />
          <button className={styles.clearBtn} onClick={() => { setFilter('ALL'); setCategory('ALL'); setShowPinned(null); setSearchQuery(''); setSortBy('newest'); setNearbyMode('ALL'); setUserLocation(null) }}>
            Clear All Filters
          </button>
        </>
      )}
    </div>
  )

  const fundingProgress = (plan: ProjectData) => {
    const goal = plan.goalAmount || 0
    const funded = plan.currentFunding || 0
    if (goal <= 0) return null
    const pct = Math.min(Math.round((funded / goal) * 100), 100)
    return (
      <div className={styles.cardFunding}>
        <div className={styles.cardFundingBar}>
          <div className={styles.cardFundingFill} style={{ width: `${pct}%` }} />
        </div>
        <span className={styles.cardFundingLabel}>{funded}/{goal} raised</span>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.publicHeader}>
        <div className={styles.publicHeaderContent}>
          <h1>Explore Projects</h1>
          <p className={styles.publicSubtitle}>
            Discover amazing projects from our community. Get inspired, join forces, or contribute to ongoing work.
          </p>
        </div>
        <div className={styles.publicHeaderMeta}>
          <span className={styles.totalCount}>{initialProjects.length} projects</span>
          <Link href="/dashboard/projects" className={styles.createProjectBtn}>+ New Project</Link>
        </div>
      </div>

      <button className={styles.mobileFilterBtn} onClick={() => setSidebarOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
        </svg>
        Filters & Sort
      </button>

      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)}>
          <div className={styles.sidebarOverlayContent} onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      <div className={`${styles.mainLayout} ${sidebarCollapsed ? styles.mainLayoutCollapsed : ''}`}>
        <div className={styles.sidebarDesktop}>
          {sidebarContent}
        </div>

        <div className={styles.content}>
          <div className={styles.resultsHeader}>
            <div className={styles.resultsHeaderLeft}>
              <button
                className={styles.sidebarToggle}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                title={sidebarCollapsed ? 'Show filters' : 'Hide filters'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {sidebarCollapsed ? (
                    <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>
                  ) : (
                    <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></>
                  )}
                </svg>
              </button>
              <span className={styles.resultsCount}>
                Showing <strong>{filteredProjects.length}</strong> {filteredProjects.length === 1 ? 'project' : 'projects'}
                {searchQuery && <> matching &ldquo;{searchQuery}&rdquo;</>}
              </span>
            </div>
            <div className={styles.resultsHeaderRight}>
              {nearbyMode === 'NEARBY' && userLocation && (
                <span className={styles.nearbyBadge}>📍 Within {userLocation.radius}mi</span>
              )}
              {viewMode === 'grid' && filteredProjects.length > 0 && (
                <span className={styles.resultsActive}>{filteredProjects.filter(p => p.status === 'ACTIVE').length} active</span>
              )}
            </div>
          </div>

          {viewMode === 'map' ? (
            <div className={styles.mapContainer}>
              <MapContainer center={defaultCenter} zoom={4} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {mapLocations.map((loc, i) => (
                  <Marker key={`${loc.id}-${i}`} position={[loc.lat, loc.lng]}>
                    <Popup>
                      <div style={{ minWidth: 150 }}>
                        <strong>{loc.title}</strong><br />
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {loc.type === 'plan' ? '📍 Project' : '📅 Event'}
                        </span><br />
                        <span style={{ fontSize: '11px' }}>{loc.info}</span><br />
                        <Link href={loc.type === 'event' ? `/events/${loc.id}` : `/projects/${loc.id}`} style={{ color: '#00d9ff', fontSize: '12px' }}>{loc.type === 'event' ? 'View Event' : 'View Project'} →</Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
              {mapLocations.length === 0 && (
                <div className={styles.mapEmpty}><p>No locations to display. Add location to your projects to see them on the map.</p></div>
              )}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIllustration}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>No projects found</h3>
              <p>Try adjusting your search or filters</p>
              <button className={styles.emptyReset} onClick={() => { setFilter('ALL'); setCategory('ALL'); setShowPinned(null); setSearchQuery(''); setNearbyMode('ALL'); setUserLocation(null) }}>
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={styles.publicGrid}>
              {filteredProjects.map((plan, index) => {
                const next = nextEvent(plan.events)
                const goalsList = parseGoalsList(plan.goals)
                const catColor = CATEGORY_COLORS[plan.category || 'OTHER'] || '#888'
                const catIcon = CATEGORY_ICONS[plan.category || 'OTHER'] || '📌'
                const distance = getProjectDistance(plan)

                return (
                  <div key={plan.id} className={`${styles.publicCard} ${plan.pinned ? styles.pinnedCard : ''}`} style={{ animationDelay: `${index * 60}ms`, cursor: 'pointer' }} onClick={(e) => { const t = e.target as HTMLElement; if (t.closest('a, button')) return; router.push(`/projects/${plan.id}`) }}>
                    {plan.pinned && (
                      <div className={styles.pinnedBadge}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
                        </svg>
                        Featured
                      </div>
                    )}

                    {distance !== null && (
                      <div className={styles.distanceBadge}>📍 {distance}mi</div>
                    )}

                    <div className={styles.cardAccent} style={{ background: catColor }} />

                    <div className={styles.publicCardHeader}>
                      <div className={styles.headerLeft}>
                        <span className={`${styles.statusBadge} ${styles[plan.status.toLowerCase()]}`}>
                          {STATUS_ICONS[plan.status]} {STATUS_LABELS[plan.status]}
                        </span>
                        {plan.category && (
                          <span className={styles.cardCategory} style={{ color: catColor }}>
                            {catIcon} {plan.category.charAt(0) + plan.category.slice(1).toLowerCase()}
                          </span>
                        )}
                        {plan.needsVolunteers && <span className={styles.volunteerBadge}>🤝 Volunteers</span>}
                        {plan.lookingForCollaborators && <span className={styles.collabBadge}>👥 Collaborators</span>}
                      </div>
                      <div className={styles.publicStats}>
                        <span title="Members">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                          </svg>
                          {plan._count.joiners}
                        </span>
                        <span title="Requests">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                          </svg>
                          {plan._count.requests}
                        </span>
                        {plan.goalAmount && plan.goalAmount > 0 && (
                          <span title="Funding">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                            </svg>
                            {plan.currentFunding || 0}/{plan.goalAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className={styles.publicCardTitle}>
                      <Link href={`/projects/${plan.id}`} className={styles.cardTitleLink}>{plan.title}</Link>
                    </h3>

                    {plan.description && <p className={styles.publicCardDesc}>{plan.description}</p>}

                    {fundingProgress(plan)}

                    {goalsList.length > 0 && (
                      <div className={styles.publicGoals}>
                        <div className={styles.goalsHeader}>
                          <span className={styles.goalsIcon}>🎯</span>
                          <span className={styles.goalsCount}>{goalsList.length} goal{goalsList.length !== 1 ? 's' : ''}</span>
                        </div>
                        <ul>{goalsList.map((goal, i) => <li key={i}>{goal}</li>)}</ul>
                      </div>
                    )}

                    {next && (
                      <div className={styles.nextEvent}>
                        <span className={styles.nextEventIcon}>📅</span>
                        <div className={styles.nextEventInfo}>
                          <span className={styles.nextEventTitle}>{next.title}</span>
                          <span className={styles.nextEventDate}>
                            {next.eventDate ? new Date(next.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                            {next.location && ` · ${next.location}`}
                          </span>
                        </div>
                      </div>
                    )}

                    {plan.events.length > 0 && !next && (
                      <div className={styles.eventCount}>📅 {plan.events.length} event{plan.events.length !== 1 ? 's' : ''}</div>
                    )}

                    {plan.location && !distance && (
                      <div className={styles.cardLocation}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        {plan.location}
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
                          <span className={styles.authorDate}>{formatDate(plan.createdAt)}</span>
                        </div>
                      </div>
                      <div className={styles.activityIndicator}>
                        <span className={styles.activityDot} />
                        <span className={styles.activityTime}>{formatDate(plan.updatedAt)}</span>
                      </div>
                    </div>

                    <Link href={`/projects/${plan.id}`} className={styles.viewProjectBtn}>View Project →</Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
