'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './rentals-browse.module.css'
import { getUserProfileUrl } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'

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
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [sort, setSort] = useState('newest')
  const [showAvailable, setShowAvailable] = useState(false)

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

      {filtered.length === 0 ? (
        <EmptyState icon="🏠" title="No rentals found" description="Try adjusting your filters or search terms." action={{ label: 'Browse All', onClick: () => window.location.href = '/rentals' }} />
      ) : (
        <div className={styles.grid}>
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
