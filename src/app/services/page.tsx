'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Modal from '@/components/ui/Modal'
import ServiceFilters from '@/components/ServiceFilters'
import ServiceCard from '@/components/ServiceCard'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import styles from './page.module.css'
import Skeleton from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import Breadcrumbs from '@/components/Breadcrumbs'
import Button from '@/components/ui/Button'
import { useQuickCreate } from '@/components/QuickCreateModal'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'
import LocationCard from '@/components/LocationCard'
import { usePassportLocation } from '@/hooks/usePassportLocation'
import { calculateDistance } from '@/lib/geocoding'


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

function safeStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}
function safeNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

export default function ServicesPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const quickCreate = useQuickCreate()
  const { location: passportLocation } = usePassportLocation()
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalServices, setTotalServices] = useState(0)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'ALL')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [selectedService, setSelectedService] = useState<ServiceOffering | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>((searchParams.get('view') as any) || 'grid')
  const PAGE_SIZE = 20

  const fetchServices = async (pageNum: number, append: boolean) => {
    const res = await fetch(`/api/services?page=${pageNum}&pageSize=${PAGE_SIZE}`)
    const data = await res.json()
    const raw = data?.data?.services || data?.services || []
    const cleaned = raw.map((s: any) => {
      if (!s || typeof s !== 'object') return null
      return {
        id: String(s.id ?? ''),
        title: typeof s.title === 'string' ? s.title : 'Untitled',
        description: typeof s.description === 'string' ? s.description : null,
        category: typeof s.category === 'string' ? s.category : 'OTHER',
        duration: typeof s.duration === 'number' ? s.duration : 60,
        price: typeof s.price === 'number' ? s.price : null,
        location: typeof s.location === 'string' ? s.location : null,
        meetingLink: typeof s.meetingLink === 'string' ? s.meetingLink : null,
        imageUrl: typeof s.imageUrl === 'string' ? s.imageUrl : null,
        isActive: s.isActive === true,
        userId: String(s.userId ?? ''),
        user: s.user && typeof s.user === 'object' ? {
          id: String(s.user.id ?? ''),
          name: typeof s.user.name === 'string' ? s.user.name : null,
          image: typeof s.user.image === 'string' ? s.user.image : null,
          username: typeof s.user.username === 'string' ? s.user.username : null,
        } : { id: '', name: null, image: null, username: null },
        viewCount: typeof s.viewCount === 'number' ? s.viewCount : 0,
      }
    }).filter(Boolean)
    setServices(prev => append ? [...prev, ...cleaned] : cleaned as ServiceOffering[])
    setTotalServices(data?.data?.total || data?.total || 0)
    setPage(pageNum)
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    fetchServices(1, false)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (category !== 'ALL') params.set('category', category)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    if (searchQuery) params.set('q', searchQuery)
    if (viewMode !== 'grid') params.set('view', viewMode)
    const qs = params.toString()
    const newUrl = `/services${qs ? '?' + qs : ''}`
    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', newUrl)
    }
  }, [category, sortBy, searchQuery, viewMode])

  const filteredServices = useMemo(() => {
    let result = [...services]
    if (category !== 'ALL') result = result.filter(s => s.category === category)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      )
    }
    if (priceMin) {
      const min = parseFloat(priceMin)
      if (!isNaN(min)) result = result.filter(s => (s.price || 0) >= min)
    }
    if (priceMax) {
      const max = parseFloat(priceMax)
      if (!isNaN(max)) result = result.filter(s => (s.price || 0) <= max)
    }

    const loc = passportLocation?.latitude ? { lat: passportLocation.latitude, lng: passportLocation.longitude, r: passportLocation.searchRadius || 50 } : null
    if (loc) {
      result = result.filter(s => {
        if (!s.latitude || !s.longitude) return true
        const d = calculateDistance(loc.lat, loc.lng, s.latitude, s.longitude)
        return d <= loc.r
      })
    }

    if (sortBy === 'price-low') result.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sortBy === 'price-high') result.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === 'duration') result.sort((a, b) => a.duration - b.duration)
    else if (sortBy === 'nearest' && loc) {
      result.sort((a, b) => {
        const dA = a.latitude ? calculateDistance(loc.lat, loc.lng, a.latitude, a.longitude!) : Infinity
        const dB = b.latitude ? calculateDistance(loc.lat, loc.lng, b.latitude, b.longitude!) : Infinity
        return dA - dB
      })
    }
    else result.reverse()
    return result
  }, [services, category, searchQuery, sortBy, priceMin, priceMax, passportLocation])

  const clearFilters = () => {
    setCategory('ALL'); setSearchQuery(''); setPriceMin(''); setPriceMax('')
  }

  const sel = selectedService
  const selTitle = sel ? (typeof sel.title === 'string' ? sel.title : 'Untitled') : ''
  const selDesc = sel ? safeStr(sel.description) : null
  const selImage = sel ? safeStr(sel.imageUrl) : null
  const selPrice = sel ? safeNum(sel.price) : null
  const selDuration = sel ? (typeof sel.duration === 'number' ? sel.duration : 60) : 60
  const selLocation = sel ? safeStr(sel.location) : null
  const selMeetingLink = sel ? safeStr(sel.meetingLink) : null
  const selUserName = sel ? safeStr(sel.user?.name) : null
  const selUserImage = sel ? safeStr(sel.user?.image) : null
  const selUserUsername = sel ? safeStr(sel.user?.username) : null
  const selCategory = sel ? (typeof sel.category === 'string' ? sel.category as ServiceCategory : 'OTHER' as ServiceCategory) : 'OTHER' as ServiceCategory

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Services' },
      ]} />
      <div className={styles.header}>
        <div>
          <h1>Services</h1>
          <p className={styles.subtitle}>Find and book services near you</p>
        </div>
        <div className={styles.headerActions}>
          {session?.user && (
            <>
              <button onClick={() => quickCreate.open('service')} className={styles.createBtn}>
                + New Service
              </button>
              <Link href="/dashboard/services" className={styles.createBtn}>
                Manage My Services
              </Link>
            </>
          )}
        </div>
      </div>

      <div className={styles.searchBar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className={styles.searchInput}
        />
        {searchQuery && (
          <Button className={styles.searchClear} variant="ghost" onClick={() => setSearchQuery('')}>✕</Button>
        )}
      </div>

      {session?.user && (
        <LocationCard
          homeCoords={passportLocation?.latitude ? [passportLocation.latitude, passportLocation.longitude] : null}
          homeName={passportLocation?.location || ''}
          passportLocName={passportLocation?.location}
          settingLocation={false}
          onSetLocation={() => {}}
          onDetect={() => {}}
          onFlyHome={() => {}}
        />
      )}

      <div className={styles.mainLayout}>
        <ServiceFilters
          category={category}
          sortBy={sortBy}
          priceMin={priceMin}
          priceMax={priceMax}
          onCategoryChange={setCategory}
          onSortChange={setSortBy}
          onPriceMinChange={setPriceMin}
          onPriceMaxChange={setPriceMax}
          onClear={clearFilters}
        />

        <main className={`${styles.content} page-enter`}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              <strong>{filteredServices.length}</strong> {filteredServices.length === 1 ? 'service' : 'services'} found
            </span>
            <div className={styles.viewToggles}>
              <button
                className={`${styles.viewToggle} ${viewMode === 'grid' ? styles.viewToggleActive : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                ▦
              </button>
              <button
                className={`${styles.viewToggle} ${viewMode === 'list' ? styles.viewToggleActive : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                ☰
              </button>
              <button
                className={`${styles.viewToggle} ${viewMode === 'map' ? styles.viewToggleActive : ''}`}
                onClick={() => setViewMode('map')}
                aria-label="Map view"
              >
                🗺️
              </button>
            </div>
          </div>

          {loading ? (
            <Skeleton width="100%" height="2rem" />
          ) : viewMode === 'map' ? (
            <div>
              <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {filteredServices.filter(s => s.latitude && s.longitude).map(s => (
                    <EntityMarker key={s.id} type="SERVICE" position={[s.latitude!, s.longitude!]}>
                      <Popup>
                        <strong>{s.title}</strong>
                        <br />
                        {s.location && <span>📍 {s.location}</span>}
                        <br />
                        <Link href={`/services/${s.id}`}>View Details →</Link>
                      </Popup>
                    </EntityMarker>
                  ))}
                </MapContainer>
              </div>
              {filteredServices.filter(s => !s.latitude || !s.longitude).length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Global / Not location specific</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filteredServices.filter(s => !s.latitude || !s.longitude).map(s => (
                      <Link key={s.id} href={`/services/${s.id}`} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                        <strong>{s.title}</strong>
                        {s.location && <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {s.location}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filteredServices.length === 0 ? (
            <EmptyState icon="🔧" title="No services found" description="Try adjusting your filters or check back later." action={{ label: 'Clear Filters', onClick: clearFilters }} />
          ) : (
            <>
              <div className={viewMode === 'list' ? styles.list : styles.grid}>
                {filteredServices.slice(0, page * PAGE_SIZE).map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onClick={() => setSelectedService(s)}
                  />
                ))}
              </div>
              {totalServices > services.length && (
                <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
                  <Button onClick={() => fetchServices(page + 1, true)}>
                    Load More ({totalServices - services.length} remaining)
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {sel && !showBooking && (
        <Modal open={true} onClose={() => setSelectedService(null)} size="lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6,
                  background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)', color: 'var(--accent-primary)',
                  fontWeight: 600, display: 'inline-block', marginBottom: 8
                }}>
                  {SERVICE_CATEGORY_ICONS[selCategory] || '📋'} {SERVICE_CATEGORY_LABELS[selCategory] || 'Other'}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selTitle}</h2>
              </div>
              <Button onClick={() => setSelectedService(null)} className={styles.closeBtn} variant="ghost">✕</Button>
            </div>

            {selImage && (
              <img src={selImage} alt={selTitle}
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
              />
            )}

            {selDesc && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px' }}>
                {selDesc}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.82rem' }}>
                🕐 {Math.floor(selDuration / 60)}h {selDuration % 60}m
              </div>
              {selPrice != null && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.82rem' }}>
                  💰 ${selPrice}
                </div>
              )}
              {selLocation && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.82rem' }}>
                  📍 {selLocation}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: 12,
              borderRadius: 8, background: 'var(--bg-tertiary)', marginBottom: 16,
              fontSize: '0.85rem'
            }}>
              {selUserImage ? (
                <img src={selUserImage} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600 }}>
                  {(selUserName || 'U')[0]}
                </span>
              )}
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selUserName || 'Anonymous'}</div>
                {selUserUsername && (
                  <Link href={`/profile/${selUserUsername}`} style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', textDecoration: 'none' }}>
                    @{selUserUsername}
                  </Link>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Link
                href={`/services/${sel.id}`}
                className={styles.viewDetailsBtn}
              >
                View Full Details
              </Link>
              <Button
                onClick={() => setShowBooking(true)}
                className={styles.bookBtn}
                variant="primary"
                disabled={!session}
              >
                {session ? '📅 Book This Service' : 'Sign in to Book'}
              </Button>
            </div>
        </Modal>
      )}

      {sel && showBooking && (
        <BookAppointmentModal
          isOpen={true}
          onClose={() => { setShowBooking(false); setSelectedService(null) }}
          sellerId={sel.userId}
          sellerName={selUserName}
          defaultDuration={typeof sel.duration === 'number' ? sel.duration : 60}
          defaultLocation={selLocation}
          defaultMeetingLink={selMeetingLink}
          serviceCategory={selCategory}
          serviceOfferingId={sel.id}
          productTitle={selTitle}
        />
      )}
    </div>
  )
}