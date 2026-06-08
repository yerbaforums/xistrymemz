'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import styles from './page.module.css'
import Breadcrumbs from '@/components/Breadcrumbs'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

const ENTITY_TYPES = [
  { key: '', label: 'All', icon: '🌐' },
  { key: 'PRODUCT', label: 'Products', icon: '🛒' },
  { key: 'SERVICE', label: 'Services', icon: '🔧' },
  { key: 'GROUP', label: 'Groups', icon: '👥' },
  { key: 'EVENT', label: 'Events', icon: '📅' },
  { key: 'PLAN', label: 'Projects', icon: '🚀' },
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
  hashtags: string[]
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  PRODUCT: '🛒',
  SERVICE: '🔧',
  GROUP: '👥',
  EVENT: '📅',
  PLAN: '🚀',
  MEMBER: '👤',
}

const TYPE_COLORS: Record<string, string> = {
  PRODUCT: '#3b82f6',
  SERVICE: '#8b5cf6',
  GROUP: '#10b981',
  EVENT: '#f59e0b',
  PLAN: '#ec4899',
  MEMBER: '#6366f1',
}

function EntityCard({ item }: { item: DiscoverItem }) {
  const href =
    item.type === 'PRODUCT' ? `/products/${item.id}` :
    item.type === 'SERVICE' ? `/services/${item.id}` :
    item.type === 'GROUP' ? `/groups/${item.id}` :
    item.type === 'EVENT' ? `/events/${item.id}` :
    item.type === 'PLAN' ? `/plans/${item.id}` :
    item.type === 'MEMBER' ? `/profile/${item.userId}` : '#'

  return (
    <Link href={href} className={styles.card}>
      <div className={styles.cardImage}>
        {item.image ? (
          <Image src={item.image} alt={item.title} width={160} height={120} style={{ objectFit: 'cover' }} />
        ) : (
          <span className={styles.cardIcon}>{TYPE_ICONS[item.type] || '📄'}</span>
        )}
        <span className={styles.typeBadge} style={{ background: TYPE_COLORS[item.type] }}>
          {TYPE_ICONS[item.type]} {item.type}
        </span>
      </div>
      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        {item.description && <p className={styles.cardDesc}>{item.description.slice(0, 100)}</p>}
        <div className={styles.cardMeta}>
          {item.price != null && <span className={styles.price}>${item.price}</span>}
          {item.distance != null && <span className={styles.distance}>📍 {item.distance} mi</span>}
          {item.location && <span className={styles.location}>{item.location}</span>}
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
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [intentFilter, setIntentFilter] = useState('')
  const [hashtagFilter, setHashtagFilter] = useState('')
  const [viewMode, setViewMode] = useState<'map' | 'grid'>('map')
  const [results, setResults] = useState<DiscoverItem[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.006])
  const L = typeof window !== 'undefined' ? require('leaflet') : null

  const fetchResults = useCallback(async (p = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (typeFilter) params.set('type', typeFilter)
    if (intentFilter) params.set('intent', intentFilter)
    if (hashtagFilter) params.set('hashtag', hashtagFilter)
    params.set('page', String(p))
    params.set('limit', '50')

    try {
      const res = await fetch(`/api/discover?${params}`)
      const data = await res.json()
      setResults(data.results || [])
      setTotal(data.total || 0)
      setPage(p)

      const locResults = data.results?.filter((r: DiscoverItem) => r.latitude && r.longitude) || []
      if (locResults.length > 0) {
        const avgLat = locResults.reduce((s: number, r: DiscoverItem) => s + r.latitude!, 0) / locResults.length
        const avgLng = locResults.reduce((s: number, r: DiscoverItem) => s + r.longitude!, 0) / locResults.length
        setMapCenter([avgLat, avgLng])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [query, typeFilter, intentFilter, hashtagFilter])

  useEffect(() => {
    fetchResults(1)
  }, [fetchResults])

  if (L && typeof window !== 'undefined') {
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
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

      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search anything..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(1)}
        />
        <button className={styles.searchBtn} onClick={() => fetchResults(1)}>Search</button>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.typeFilters}>
          {ENTITY_TYPES.map(t => (
            <button
              key={t.key}
              className={`${styles.typePill} ${typeFilter === t.key ? styles.typePillActive : ''}`}
              onClick={() => { setTypeFilter(t.key); setPage(1) }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterRow}>
        {INTENT_FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.intentPill} ${intentFilter === f.key ? styles.intentPillActive : ''}`}
            onClick={() => { setIntentFilter(f.key); setPage(1) }}
          >
            {f.label}
          </button>
        ))}
        <input
          type="text"
          className={styles.hashtagInput}
          placeholder="Filter by hashtag..."
          value={hashtagFilter}
          onChange={e => setHashtagFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchResults(1)}
        />
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'map' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('map')}
          >🗺️ Map</button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => setViewMode('grid')}
          >📋 Grid</button>
        </div>
      </div>

      {loading && <div className={styles.loading}>Searching...</div>}

      {!loading && viewMode === 'map' && (
        <div className={styles.mapContainer}>
          <MapContainer center={mapCenter} zoom={4} className={styles.map} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {results.filter(r => r.latitude && r.longitude).map(r => (
              <Marker key={`${r.type}-${r.id}`} position={[r.latitude!, r.longitude!]}>
                <Popup>
                  <div className={styles.popup}>
                    <strong>{r.title}</strong>
                    <span style={{ color: TYPE_COLORS[r.type], fontSize: '0.8rem' }}>
                      {TYPE_ICONS[r.type]} {r.type}
                    </span>
                    {r.distance != null && <span>📍 {r.distance} mi</span>}
                    <Link href={
                      r.type === 'PRODUCT' ? `/products/${r.id}` :
                      r.type === 'SERVICE' ? `/services/${r.id}` :
                      r.type === 'GROUP' ? `/groups/${r.id}` :
                      r.type === 'EVENT' ? `/events/${r.id}` :
                      r.type === 'PLAN' ? `/plans/${r.id}` :
                      `/profile/${r.userId}`
                    } className={styles.popupLink}>View Details →</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loading && viewMode === 'grid' && (
        <>
          <div className={styles.resultInfo}>{total} result{total !== 1 ? 's' : ''} found</div>
          <div className={styles.grid}>
            {results.map(r => <EntityCard key={`${r.type}-${r.id}`} item={r} />)}
          </div>
          {results.length === 0 && (
            <div className={styles.empty}>No results found. Try adjusting your filters.</div>
          )}
          {total > page * 50 && (
            <button className={styles.loadMore} onClick={() => fetchResults(page + 1)}>
              Load More ({Math.min(50, total - page * 50)} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}
