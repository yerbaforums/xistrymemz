'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import ServiceFilters from '@/components/ServiceFilters'
import ServiceCard from '@/components/ServiceCard'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import styles from './page.module.css'

function safeStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}
function safeNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

export default function ServicesPage() {
  const { data: session } = useSession()
  const [services, setServices] = useState<ServiceOffering[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [location, setLocation] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedService, setSelectedService] = useState<ServiceOffering | null>(null)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        const raw = data.services || []
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
        setServices(cleaned as ServiceOffering[])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredServices = useMemo(() => {
    let result = [...services]
    if (category !== 'ALL') result = result.filter(s => s.category === category)
    if (location !== 'ALL') result = result.filter(s => s.location === location)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      )
    }
    if (sortBy === 'price-low') result.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (sortBy === 'price-high') result.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (sortBy === 'duration') result.sort((a, b) => a.duration - b.duration)
    else result.reverse()
    return result
  }, [services, category, location, searchQuery, sortBy])

  const locations = useMemo(
    () => [...new Set(services.map(s => s.location).filter(Boolean))] as string[],
    [services]
  )

  const clearFilters = () => {
    setCategory('ALL'); setLocation('ALL'); setSearchQuery('')
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
      <div className={styles.header}>
        <div>
          <h1>Services</h1>
          <p className={styles.subtitle}>Find and book services near you</p>
        </div>
        <div className={styles.headerActions}>
          {session?.user && (
            <Link href="/dashboard/services" className={styles.createBtn}>
              + Manage My Services
            </Link>
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
          <button className={styles.searchClear} onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      <div className={styles.mainLayout}>
        <ServiceFilters
          category={category}
          location={location}
          locations={locations}
          sortBy={sortBy}
          onCategoryChange={setCategory}
          onLocationChange={setLocation}
          onSortChange={setSortBy}
          onClear={clearFilters}
        />

        <main className={styles.content}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsCount}>
              <strong>{filteredServices.length}</strong> {filteredServices.length === 1 ? 'service' : 'services'} found
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading services...</div>
          ) : filteredServices.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔧</div>
              <h3>No services found</h3>
              <p>Try adjusting your filters or check back later.</p>
              <button onClick={clearFilters} className={styles.clearBtn}>Clear Filters</button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredServices.map(s => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onClick={() => setSelectedService(s)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {sel && !showBooking && (
        <div className="modal-overlay" onClick={() => { setSelectedService(null) }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 560 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span style={{
                  fontSize: '0.75rem', padding: '3px 10px', borderRadius: 6,
                  background: 'var(--accent-primary)15', color: 'var(--accent-primary)',
                  fontWeight: 600, display: 'inline-block', marginBottom: 8
                }}>
                  {SERVICE_CATEGORY_ICONS[selCategory] || '📋'} {SERVICE_CATEGORY_LABELS[selCategory] || 'Other'}
                </span>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selTitle}</h2>
              </div>
              <button onClick={() => setSelectedService(null)} className={styles.closeBtn}>✕</button>
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
              <button
                onClick={() => setShowBooking(true)}
                className={styles.bookBtn}
                disabled={!session}
              >
                {session ? '📅 Book This Service' : 'Sign in to Book'}
              </button>
            </div>
          </div>
        </div>
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