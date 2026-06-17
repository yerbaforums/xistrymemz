'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Product } from '@/types/product'
import styles from './ProductMapView.module.css'
import { EmptyState } from '@/components/EmptyState'
import { useTheme } from '@/context/ThemeContext'
import { MapContainer, TileLayer, Popup } from '@/components/LeafletComponents'
import EntityMarker from '@/components/EntityMarker'

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

let L: typeof import('leaflet') | null = null
if (typeof window !== 'undefined') {
  import('leaflet').then(mod => {
    L = mod
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  })
}

interface ProductMapViewProps {
  products: Product[]
  userLocation: { lat: number; lon: number } | null
  mapRef?: React.MutableRefObject<any>
  settingLocation?: boolean
  onMapClickSetLocation?: (lat: number, lng: number) => void
}

export default function ProductMapView({ products, userLocation, mapRef: externalMapRef, settingLocation, onMapClickSetLocation }: ProductMapViewProps) {
  const { mode } = useTheme()
  const internalMapRef = useRef<any>(null)
  const mapRef = externalMapRef || internalMapRef
  const [globalExpanded, setGlobalExpanded] = useState(false)

  const mappableProducts = products.filter(p =>
    (p.latitude != null && p.longitude != null) || p.isGlobal
  )
  const productsWithCoords = mappableProducts.filter(p => p.latitude != null && p.longitude != null)
  const globalProducts = mappableProducts.filter(p => p.isGlobal && (p.latitude == null || p.longitude == null))

  const getCenter = (): [number, number] => {
    if (userLocation) return [userLocation.lat, userLocation.lon]
    if (productsWithCoords.length > 0) {
      if (productsWithCoords.length === 1) return [productsWithCoords[0].latitude!, productsWithCoords[0].longitude!]
      const lats = productsWithCoords.map(p => p.latitude!)
      const lons = productsWithCoords.map(p => p.longitude!)
      return [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lons) + Math.max(...lons)) / 2]
    }
    return [39.8283, -98.5795]
  }

  const getZoom = (): number => {
    if (userLocation) return 10
    if (productsWithCoords.length === 0) return 4
    if (productsWithCoords.length === 1) return 13
    const lats = productsWithCoords.map(p => p.latitude!)
    const lons = productsWithCoords.map(p => p.longitude!)
    const maxDiff = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons))
    if (maxDiff < 0.1) return 13
    if (maxDiff < 0.5) return 11
    if (maxDiff < 1) return 10
    if (maxDiff < 5) return 8
    if (maxDiff < 10) return 6
    return 4
  }

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(getCenter(), getZoom(), { animate: true })
    }
  }, [products, userLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !settingLocation || !onMapClickSetLocation) return
    const handler = (e: any) => {
      onMapClickSetLocation(e.latlng.lat, e.latlng.lng)
    }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [settingLocation, onMapClickSetLocation])

  if (productsWithCoords.length === 0 && globalProducts.length === 0) {
    return <EmptyState icon="🗺️" title="No products to show" description="Products with location data will appear on the map." />
  }

  return (
    <div className={styles.wrapper}>
      {settingLocation && <div className={styles.mapOverlay}>Click anywhere on the map to set your home location</div>}
      {globalProducts.length > 0 && (
        <div className={styles.globalBar}>
          <button
            className={styles.globalToggle}
            onClick={() => setGlobalExpanded(!globalExpanded)}
          >
            <span>🌍 {globalProducts.length} Global Item{globalProducts.length !== 1 ? 's' : ''}</span>
            <svg
              className={`${styles.globalChevron} ${globalExpanded ? styles.globalChevronOpen : ''}`}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {globalExpanded && (
            <div className={styles.globalList}>
              {globalProducts.map(p => (
                <Link key={p.id} href={`/products/${p.id}`} className={styles.globalItem}>
                  {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.globalItemImg} />}
                  <div className={styles.globalItemInfo}>
                    <strong>{p.title}</strong>
                    {p.price != null && <span className={styles.globalItemPrice}>${p.price}</span>}
                    <span className={styles.globalItemBadge}>🌍 Available worldwide</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      <MapContainer
        center={getCenter()}
        zoom={getZoom()}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution={mode === 'dark' ? DARK_ATTR : LIGHT_ATTR}
          url={mode === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL}
        />
        {productsWithCoords.map(product => (
          <EntityMarker
            key={product.id}
            type="PRODUCT"
            position={[product.latitude!, product.longitude!]}
          >
            <Popup>
              <div className={styles.popup}>
                {product.imageUrl && <img src={product.imageUrl} alt="" className={styles.popupImg} />}
                <h4 className={styles.popupTitle}>{product.title}</h4>
                {product.price != null && <p className={styles.popupPrice}>${product.price}</p>}
                <p className={styles.popupMeta}>{product.isGlobal ? '🌍 Global' : `📍 ${product.location || 'Local'}`}</p>
                <Link href={`/products/${product.id}`} className={styles.popupLink}>View Details →</Link>
              </div>
            </Popup>
          </EntityMarker>
        ))}
      </MapContainer>
    </div>
  )
}
