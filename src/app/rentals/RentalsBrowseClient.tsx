'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './rentals-browse.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import { useSession } from 'next-auth/react'
import { EmptyState } from '@/components/EmptyState'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'

interface RentalItem {
  id: string
  title: string
  description: string | null
  price: number | null
  category: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  isGlobal: boolean
  imageUrl: string | null
  rentalDaily: number | null
  rentalWeekly: number | null
  rentalMonthly: number | null
  rentalDeposit: number | null
  rentalMinDays: number
  rentalMaxDays: number | null
  rentalAvailable: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    image: string | null
    username: string | null
    shopSlug: string | null
  }
}

interface Props {
  initialRentals: RentalItem[]
  categories: string[]
  locations: string[]
}

export default function RentalsBrowseClient({ initialRentals, categories, locations }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'ALL')
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || 'ALL')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [showAvailable, setShowAvailable] = useState(searchParams.get('available') === 'true')
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>((searchParams.get('view') as any) || 'grid')

  useEffect(() => {
    const params = new URLSearchParams()
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter)
    if (locationFilter !== 'ALL') params.set('location', locationFilter)
    if (sort !== 'newest') params.set('sort', sort)
    if (search) params.set('q', search)
    if (showAvailable) params.set('available', 'true')
    if (viewMode !== 'grid') params.set('view', viewMode)
    const qs = params.toString()
    const newUrl = `/rentals${qs ? '?' + qs : ''}`
    if (newUrl !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, '', newUrl)
    }
  }, [categoryFilter, locationFilter, sort, search, showAvailable, viewMode])

  const filtered = useMemo(() => {
    let items = [...initialRentals]

    if (search) {
      const q = search.toLowerCase()
      items = items.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q))
      )
    }

    if (categoryFilter !== 'ALL') {
      items = items.filter(r => r.category === categoryFilter)
    }

    if (locationFilter !== 'ALL') {
      if (locationFilter === 'GLOBAL') {
        items = items.filter(r => r.isGlobal)
      } else {
        items = items.filter(r => r.location === locationFilter)
      }
    }

    if (showAvailable) {
      items = items.filter(r => r.rentalAvailable)
    }

    switch (sort) {
      case 'newest':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'daily_low':
        items.sort((a, b) => (a.rentalDaily ?? Infinity) - (b.rentalDaily ?? Infinity))
        break
      case 'daily_high':
        items.sort((a, b) => (b.rentalDaily ?? 0) - (a.rentalDaily ?? 0))
        break
    }

    return items
  }, [initialRentals, search, categoryFilter, locationFilter, sort, showAvailable])

  function formatRentalPrice(item: RentalItem) {
    const parts: string[] = []
    if (item.rentalDaily) parts.push(`$${item.rentalDaily}/day`)
    if (item.rentalWeekly) parts.push(`$${item.rentalWeekly}/wk`)
    if (item.rentalMonthly) parts.push(`$${item.rentalMonthly}/mo`)
    return parts.join(' · ') || (item.price ? `$${item.price}` : 'Contact for pricing')
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        {session && (
          <Link href="/dashboard/rentals" style={{ display: 'inline-block', background: 'var(--accent-primary)', color: 'white', padding: '10px 24px', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>+ List Rental</Link>
        )}
      </div>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search rentals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Locations</option>
          <option value="GLOBAL">Global</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <select value={sort} onChange={e => setSort(e.target.value)} className={styles.filterSelect}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="daily_low">Price: Low First</option>
          <option value="daily_high">Price: High First</option>
        </select>

        <label className={styles.availableToggle}>
          <input
            type="checkbox"
            checked={showAvailable}
            onChange={e => setShowAvailable(e.target.checked)}
          />
          <span>Available only</span>
        </label>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <strong>{filtered.length}</strong> {filtered.length === 1 ? 'rental' : 'rentals'} found
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

      {filtered.length === 0 ? (
        <EmptyState icon="🏠" title="No rentals found" description="Try adjusting your filters or search terms." action={{ label: 'Browse All', onClick: () => router.push('/rentals') }} />
      ) : viewMode === 'map' ? (
        <div>
          <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
            <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filtered.filter(r => r.latitude && r.longitude).map(item => (
                <EntityMarker key={item.id} type="RENTAL" position={[item.latitude!, item.longitude!]}>
                  <Popup>
                    <strong>{item.title}</strong>
                    <br />
                    {item.location && <span>📍 {item.location}</span>}
                    <br />
                    <Link href={`/products/${item.id}`}>View Details →</Link>
                  </Popup>
                </EntityMarker>
              ))}
            </MapContainer>
          </div>
          {filtered.filter(r => !r.latitude || !r.longitude).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Global / Not location specific</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtered.filter(r => !r.latitude || !r.longitude).map(item => (
                  <Link key={item.id} href={`/products/${item.id}`} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                    <strong>{item.title}</strong>
                    {item.location && <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {item.location}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={viewMode === 'list' ? styles.list : styles.grid}>
          {filtered.map(item => (
            <Link key={item.id} href={`/products/${item.id}`} className={styles.card}>
              <div className={styles.cardImage}>
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.title} width={300} height={200} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                ) : (
                  <div className={styles.cardImagePlaceholder}>🏠</div>
                )}
                {!item.rentalAvailable && (
                  <span className={styles.unavailableBadge}>Unavailable</span>
                )}
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardPrice}>{formatRentalPrice(item)}</p>
                {item.rentalDeposit && (
                  <p className={styles.cardDeposit}>Deposit: ${item.rentalDeposit}</p>
                )}
                <p className={styles.cardMeta}>
                  <span>📍 {item.location || 'Location TBD'}</span>
                  {item.category && <span>🏷️ {item.category}</span>}
                </p>
                <p className={styles.cardDays}>
                  Min {item.rentalMinDays} day{item.rentalMinDays !== 1 ? 's' : ''}
                  {item.rentalMaxDays ? ` · Max ${item.rentalMaxDays} days` : ''}
                </p>
                <p className={styles.cardSeller}>
                  by {item.user.name || 'Anonymous'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
