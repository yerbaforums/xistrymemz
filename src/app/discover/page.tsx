'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'
import Button from '@/components/ui/Button'
import Loading from '@/components/Loading'
import { EmptyState } from '@/components/EmptyState'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'
import { getEntityIcon, getEntityColor } from '@/lib/entity-icons'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import LocationCard from '@/components/LocationCard'

const ENTITY_TYPES = [
  { key: '', label: 'All', icon: '🌐' },
  { key: 'PRODUCT', label: 'Products', icon: '🛒' },
  { key: 'SERVICE', label: 'Services', icon: '🔧' },
  { key: 'GROUP', label: 'Groups', icon: '👥' },
  { key: 'EVENT', label: 'Events', icon: '📅' },
  { key: 'PROJECT', label: 'Projects', icon: '🚀' },
  { key: 'BOARD', label: 'Boards', icon: '🪵' },
  { key: 'REQUEST', label: 'Requests', icon: '📝' },
  { key: 'SHOP', label: 'Shops', icon: '🏪' },
  { key: 'RENTAL', label: 'Rentals', icon: '🏠' },
  { key: 'MEMBER', label: 'Members', icon: '👤' },
]

const INTENT_FILTERS = [
  { key: '', label: 'All' },
  { key: 'COLLABORATE', label: '🤝 Collaborate' },
]

interface DiscoverItem {
  id: string
  type: string
  title: string
  description: string | null
  image: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  distance: number | null
  price: number | null
  category: string | null
  lookingForCollaborators: boolean
  userId: string
  userName: string | null
  userImage: string | null
  username: string | null
  hashtags: string[]
  eventDate: string | null
  createdAt: string
}

function EntityCard({ item, mapRef, setMapVisible, onHover, onLeave, selected }: { item: DiscoverItem; mapRef: any; setMapVisible: (v: boolean) => void; onHover?: (id: string | null) => void; onLeave?: () => void; selected?: boolean }) {
  const href =
    item.type === 'PRODUCT' ? `/products/${item.id}` :
    item.type === 'SERVICE' ? `/services/${item.id}` :
    item.type === 'GROUP' ? `/groups/${item.id}` :
    item.type === 'EVENT' ? `/events/${item.id}` :
    item.type === 'PROJECT' ? `/projects/${item.id}` :
    item.type === 'BOARD' ? `/boards/${item.id}` :
    item.type === 'RENTAL' ? `/products/${item.id}` :
    item.type === 'REQUEST' ? `/requests/${item.id}` :
    item.type === 'SHOP' ? `/shop/${item.id}` :
    item.type === 'MEMBER' ? `/profile/${item.username || item.userId}` : '#'

  return (
    <Link href={href} className={styles.card} onMouseEnter={() => onHover?.(item.id)} onMouseLeave={() => onLeave?.()}>
      <div className={styles.cardImage}>
        {item.image ? (
          <Image src={item.image} alt={item.title} width={160} height={120} style={{ objectFit: 'cover' }} />
        ) : (
          <span className={styles.cardIcon}>{getEntityIcon(item.type)}</span>
        )}
        <span className={styles.typeBadge} style={{ background: getEntityColor(item.type) }}>
          {getEntityIcon(item.type)} {item.type}
        </span>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        {item.description && <p className={styles.cardDesc}>{item.description.slice(0, 100)}</p>}
        <div className={styles.cardMeta}>
          {item.price != null && <span className={styles.price}>${item.price}</span>}
          {item.distance != null && <span className={styles.distance}>📍 {item.distance} mi</span>}
          {item.location && <span className={styles.location}>{item.location}</span>}
          {item.latitude && item.longitude && (
            <button className={styles.flyBtn} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHover?.(null); setMapVisible(true); setTimeout(() => mapRef.current?.flyTo([item.latitude!, item.longitude!], 10, { duration: 0.8 }), 100) }} title="Show on map">📍</button>
          )}
        </div>
        <div className={styles.cardFooter}>
          {item.userName && (
            <span className={styles.userInfo}>
              {item.userImage ? (
                <Image src={item.userImage} alt="" width={18} height={18} className={styles.userAvatar} />
              ) : null}
              {item.userName}
            </span>
          )}
          {item.lookingForCollaborators && <span className={styles.collabBadge}>🤝</span>}
          {item.hashtags.slice(0, 3).map(t => (
            <span key={t} className={styles.hashtag}>#{t}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

export default function DiscoverPage() {
  const { data: session } = useSession()
  const { location: passportLoc } = usePassportLocation()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [hashtagFilter, setHashtagFilter] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [calVisible, setCalVisible] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [results, setResults] = useState<DiscoverItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006])
  const [homeCoords, setHomeCoords] = useState<[number, number] | null>(null)
  const [mapVisible, setMapVisible] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [L, setL] = useState<any>(null)
  const mapRef = useRef<any>(null)

  const fetchResults = useCallback(async (p = 1, append = false) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (typeFilter) params.set('type', typeFilter)
    if (intentFilter) params.set('intent', intentFilter)
    if (hashtagFilter) params.set('hashtag', hashtagFilter)
    params.set('page', String(p))
    params.set('limit', '50')

    const loc = passportLoc?.latitude ? { lat: passportLoc.latitude, lng: passportLoc.longitude, r: passportLoc.searchRadius || 250 } : null
    if (loc) {
      params.set('lat', String(loc.lat))
      params.set('lng', String(loc.lng))
      params.set('radius', String(loc.r))
    }

    try {
      const res = await fetch(`/api/discover?${params}`)
      if (!res.ok) { console.error('Discover API error:', res.status); setLoading(false); return }
      const data = await res.json()
      const resData = data?.data || data
      setResults(prev => append ? [...prev, ...(resData.results || [])] : (resData.results || []))
      setTotal(resData.total || 0)
      setPage(p)

      const locResults = resData.results?.filter((r: DiscoverItem) => r.latitude && r.longitude) || []
      const userHasLocation = passportLoc?.latitude || mapCenter[0] !== 51.505
      if (locResults.length > 0 && !userHasLocation) {
        const avgLat = locResults.reduce((s: number, r: DiscoverItem) => s + r.latitude!, 0) / locResults.length
        const avgLng = locResults.reduce((s: number, r: DiscoverItem) => s + r.longitude!, 0) / locResults.length
        setMapCenter([avgLat, avgLng])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [query, typeFilter, intentFilter, hashtagFilter, passportLoc])

  useEffect(() => {
    fetchResults(1, false)
  }, [fetchResults])

  useEffect(() => {
    import('leaflet').then(mod => setL(mod))
  }, [])

  useEffect(() => {
    if (!L) return
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [L])

  useEffect(() => {
    if (passportLoc?.latitude && passportLoc?.longitude) {
      setHomeCoords([passportLoc.latitude, passportLoc.longitude])
      setMapCenter([passportLoc.latitude, passportLoc.longitude])
    }
  }, [passportLoc])

  useEffect(() => {
    if (homeCoords && mapRef.current) {
      mapRef.current.flyTo(homeCoords, 10, { duration: 1.5 })
    }
  }, [homeCoords])

  const sortedResults = useMemo(() => {
    const sorted = [...results]
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === 'popular') {
      sorted.sort((a, b) => {
        if (a.lookingForCollaborators !== b.lookingForCollaborators) {
          return a.lookingForCollaborators ? -1 : 1
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    } else if (sortBy === 'nearest') {
      sorted.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
    }
    return sorted
  }, [results, sortBy])

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
      const itemsOnDay = sortedResults.filter(r => {
        if (r.type !== 'EVENT') return false
        const date = r.eventDate || r.createdAt
        if (!date) return false
        const d = new Date(date).toISOString().split('T')[0]
        return d === dateStr
      })

      days.push(
        <div key={day} className={`${styles.calendarCell} ${itemsOnDay.length > 0 ? styles.hasEvents : ''}`}>
          <span className={styles.calendarDayNumber}>{day}</span>
          <div className={styles.calendarEvents}>
            {itemsOnDay.slice(0, 3).map(item => {
              const href =
                item.type === 'PRODUCT' ? `/products/${item.id}` :
                item.type === 'SERVICE' ? `/services/${item.id}` :
                item.type === 'GROUP' ? `/groups/${item.id}` :
                item.type === 'EVENT' ? `/events/${item.id}` :
                item.type === 'PROJECT' ? `/projects/${item.id}` :
                item.type === 'BOARD' ? `/boards/${item.id}` :
                item.type === 'RENTAL' ? `/products/${item.id}` :
                item.type === 'REQUEST' ? `/requests/${item.id}` :
                item.type === 'SHOP' ? `/shop/${item.id}` :
                item.type === 'MEMBER' ? `/profile/${item.username || item.userId}` : '#'
              return (
                <Link key={`${item.type}-${item.id}`} href={href} className={styles.calendarEventItem}>
                  <span className={styles.calendarEventIcon}>{getEntityIcon(item.type)}</span>
                  <span className={styles.calendarEventTitle}>{item.title}</span>
                </Link>
              )
            })}
            {itemsOnDay.length > 3 && <span className={styles.moreEvents}>+{itemsOnDay.length - 3} more</span>}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Discover' },
      ]} />
      <div className={styles.header}>
        <h1 className={styles.title}>Discover</h1>
        <p className={styles.subtitle}>Find people, products, groups, events, and projects near you</p>
      </div>

      {session?.user && (
        <LocationCard
          homeCoords={homeCoords}
          homeName={passportLoc?.location || ''}
          passportLocName={passportLoc?.location}
          settingLocation={false}
          onSetLocation={() => {}}
          onDetect={() => {}}
          onFlyHome={() => { if (mapRef.current && homeCoords) mapRef.current.flyTo(homeCoords, 10, { duration: 1 }) }}
        />
      )}

      <div className={styles.searchRow} style={{ gap: 6, marginBottom: 8 }}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search anything..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(1, false)}
          style={{ padding: '6px 10px', fontSize: '0.85rem', flex: 1, minWidth: 0 }}
        />
        <button className={styles.searchBtn} onClick={() => fetchResults(1, false)} style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderRadius: 6, background: 'var(--accent-primary)', color: 'var(--bg-primary)', border: 'none', fontWeight: 600 }} aria-label="Search">🔍</button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.typeFilters}>
          {ENTITY_TYPES.map(t => (
            <Button
              key={t.key}
              variant="secondary"
              className={`${styles.typePill} ${typeFilter === t.key ? styles.typePillActive : ''}`}
              onClick={() => { setTypeFilter(t.key); setPage(1) }}
            >
              {t.icon} {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={styles.filterRow}>
        {INTENT_FILTERS.map(f => (
          <Button
            key={f.key}
            variant="secondary"
            className={`${styles.intentPill} ${intentFilter === f.key ? styles.intentPillActive : ''}`}
            onClick={() => { setIntentFilter(f.key); setPage(1) }}
          >
            {f.label}
          </Button>
        ))}
        <input
          type="text"
          className={styles.hashtagInput}
          placeholder="Filter by hashtag..."
          value={hashtagFilter}
          onChange={e => setHashtagFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(1)}
        />
        <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="newest">🕐 Newest</option>
          <option value="popular">🔥 Most Popular</option>
          <option value="nearest">📍 Nearest</option>
        </select>
        <div className={styles.viewToggle}>
          <Button variant="ghost" className={`${styles.viewBtn} ${mapVisible ? styles.viewBtnActive : ''}`} onClick={() => setMapVisible(v => !v)}>
            {mapVisible ? '🙈' : '🗺️'} {mapVisible ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button variant="ghost" className={`${styles.viewBtn} ${calVisible ? styles.viewBtnActive : ''}`} onClick={() => setCalVisible(v => !v)}>
            {calVisible ? '📅' : '📅'} {calVisible ? 'Hide Calendar' : 'Show Calendar'}
          </Button>
        </div>
      </div>

      {loading && <Loading size="medium" message="Searching..." />}

      {!loading && mapVisible && (
        <div className={styles.mapContainer}>
          <MapContainer ref={mapRef} center={mapCenter} zoom={4} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {homeCoords && (
              <Marker position={homeCoords}>
                <Popup>
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <strong>🏠 Your Location</strong>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#666' }}>{passportLoc?.location || `${homeCoords[0].toFixed(4)}, ${homeCoords[1].toFixed(4)}`}</span>
                  </div>
                </Popup>
              </Marker>
            )}
            {sortedResults.filter(r => r.latitude && r.longitude).map(r => (
              <EntityMarker key={`${r.type}-${r.id}`} type={r.type} position={[r.latitude!, r.longitude!]} highlighted={r.id === hoveredId || r.id === selectedId}>
                <Popup>
                  <div className={styles.popup}>
                    <strong>{r.title}</strong>
                    <span style={{ color: getEntityColor(r.type), fontSize: '0.8rem' }}>
                      {getEntityIcon(r.type)} {r.type}
                    </span>
                    {r.distance != null && <span>📍 {r.distance} mi</span>}
                    <Link href={
                      r.type === 'PRODUCT' ? `/products/${r.id}` :
                      r.type === 'SERVICE' ? `/services/${r.id}` :
                      r.type === 'GROUP' ? `/groups/${r.id}` :
                      r.type === 'EVENT' ? `/events/${r.id}` :
                      r.type === 'PROJECT' ? `/projects/${r.id}` :
                      r.type === 'BOARD' ? `/boards/${r.id}` :
                      r.type === 'RENTAL' ? `/products/${r.id}` :
                      r.type === 'REQUEST' ? `/requests/${r.id}` :
                      r.type === 'SHOP' ? `/shop/${r.id}` :
                      r.type === 'MEMBER' ? `/profile/${r.userId}` : '#'
                    } className={styles.popupLink}>View Details →</Link>
                  </div>
                </Popup>
              </EntityMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loading && calVisible && (
        <div className={styles.calendarWrap}>
          <div className={styles.calendarHeader}>
            <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNavBtn} variant="ghost">←</Button>
            <h2>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
            <Button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNavBtn} variant="ghost">→</Button>
          </div>
          <div className={styles.calendarGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className={styles.calendarDayHeader}>{day}</div>
            ))}
            {getCalendarDays()}
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className={styles.resultInfo}>{total} result{total !== 1 ? 's' : ''} found</div>
          <div className={styles.grid}>
            {sortedResults.map(r => <EntityCard key={`${r.type}-${r.id}`} item={r} mapRef={mapRef} setMapVisible={setMapVisible} onHover={setHoveredId} onLeave={() => setHoveredId(null)} selected={r.id === selectedId} />)}
          </div>
          {results.length === 0 && (
            <EmptyState icon="🔍" title="No results found" description="Try adjusting your filters." />
          )}
          {total > page * 50 && (
            <Button variant="primary" className={styles.loadMore} onClick={() => fetchResults(page + 1, true)}>
              Load More ({Math.min(50, total - page * 50)} remaining)
            </Button>
          )}
        </>
      )}
    </div>
  )
}
