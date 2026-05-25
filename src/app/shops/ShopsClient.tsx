'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import styles from './page.module.css'
import AlphabeticalIndex, { type IndexItem } from '@/components/AlphabeticalIndex'
import { SHOP_CATEGORIES } from '@/lib/shop-categories'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

interface Shop {
  id: string
  shopName: string
  shopAbout: string | null
  shopImage: string | null
  shopSlug: string
  shopCategory: string | null
  name: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  _count?: {
    products: number
  }
}

interface ShopsClientProps {
  initialShops: Shop[]
}

const catMap = new Map(SHOP_CATEGORIES.map(c => [c.value, c]))

export function ShopsClient({ initialShops }: ShopsClientProps) {
  const [shops] = useState<Shop[]>(initialShops)
  const [mapExpanded, setMapExpanded] = useState(false)
  const [selectedShop, setSelectedShop] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const mapRef = useRef<any>(null)

  const filtered = useMemo(() =>
    shops.filter(s => {
      if (search && !s.shopName.toLowerCase().includes(search.toLowerCase()) && !s.shopAbout?.toLowerCase().includes(search.toLowerCase())) return false
      if (categoryFilter !== 'all' && (s.shopCategory || 'OTHER') !== categoryFilter) return false
      return true
    }),
    [shops, search, categoryFilter]
  )

  const indexItems: IndexItem[] = useMemo(() =>
    filtered.map(s => ({
      id: s.id,
      label: s.shopName,
      sortKey: s.shopName,
      category: s.shopCategory || 'OTHER'
    })),
    [filtered]
  )

  const shopsWithCoords = filtered.filter(s => s.latitude && s.longitude)

  const getMapCenter = useCallback((): [number, number] => {
    if (shopsWithCoords.length === 0) return [39.8283, -98.5795]
    const avgLat = shopsWithCoords.reduce((sum, s) => sum + (s.latitude || 0), 0) / shopsWithCoords.length
    const avgLng = shopsWithCoords.reduce((sum, s) => sum + (s.longitude || 0), 0) / shopsWithCoords.length
    return [avgLat, avgLng]
  }, [shopsWithCoords])

  const renderShop = useCallback((item: IndexItem) => {
    const shop = shops.find(s => s.id === item.id)!
    const cat = catMap.get(shop.shopCategory || 'OTHER')
    return (
      <Link
        key={shop.id}
        href={`/shop/${shop.shopSlug}`}
        className={`${styles.shopCard} ${selectedShop === shop.id ? styles.selected : ''}`}
        onClick={() => setSelectedShop(shop.id)}
      >
        {shop.shopImage && (
          <div className={styles.shopImage}>
            <img src={shop.shopImage} alt={shop.shopName} />
          </div>
        )}
        <div className={styles.shopInfo}>
          <div className={styles.shopHeader}>
            <h3>{shop.shopName}</h3>
            {cat && <span className={styles.categoryBadge}>{cat.icon} {cat.label}</span>}
          </div>
          {shop.shopAbout && <p>{shop.shopAbout.slice(0, 80)}...</p>}
          {shop.location && (
            <span className={styles.location}>📍 {shop.location}</span>
          )}
          <div className={styles.shopFooter}>
            <span className={styles.shopOwner}>by {shop.name || 'Unknown'}</span>
            {shop._count && (
              <span className={styles.productCount}>{shop._count.products} products</span>
            )}
          </div>
        </div>
      </Link>
    )
  }, [shops, selectedShop])

  return (
    <div className={styles.container}>
      {shopsWithCoords.length > 0 && (
        <div className={`${styles.mapWrapper} ${mapExpanded ? styles.mapExpanded : ''}`}>
          <button onClick={() => setMapExpanded(!mapExpanded)} className={styles.mapToggle}>
            {mapExpanded ? 'Collapse Map' : 'Expand Map'}
          </button>
          <MapContainer center={getMapCenter()} zoom={4} ref={mapRef} className={styles.map}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {shopsWithCoords.map(shop => (
              <Marker
                key={shop.id}
                position={[shop.latitude!, shop.longitude!]}
                eventHandlers={{ click: () => setSelectedShop(shop.id) }}
              >
                <Popup>
                  <div>
                    <h4>{shop.shopName}</h4>
                    <p>{shop.shopAbout?.slice(0, 100)}...</p>
                    <Link href={`/shop/${shop.shopSlug}`}>Visit Shop</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Search shops..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={styles.filterSelect}>
          <option value="all">All Categories</option>
          {SHOP_CATEGORIES.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
          ))}
        </select>
      </div>

      <div className={styles.resultsHeader}>
        <span>{filtered.length} shops found</span>
      </div>

      {filtered.length === 0 ? (
        shops.length === 0 ? (
          <div className={styles.empty}>
            <p>No shops yet. Be the first to create one!</p>
            <Link href="/shop/setup" className={styles.createBtn}>
              Create Shop
            </Link>
          </div>
        ) : null
      ) : (
        <AlphabeticalIndex
          items={indexItems}
          renderCard={renderShop}
          groupBy={item => {
            const cat = catMap.get(item.category || 'OTHER')
            return cat ? `${cat.icon} ${cat.label}` : 'Other'
          }}
          sidebarTitle="Browse by Category"
        />
      )}

      {shopsWithCoords.length === 0 && shops.length > 0 && (
        <p className={styles.encouragement}>
          💡 Want to see shops on the map? Add your location in shop settings.
        </p>
      )}
    </div>
  )
}
