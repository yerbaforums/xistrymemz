'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import type { Product } from '@/types/product'
import styles from './ProductMapView.module.css'
import { useTheme } from '@/context/ThemeContext'

const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

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
}

export default function ProductMapView({ products, userLocation }: ProductMapViewProps) {
  const { mode } = useTheme()
  const mapRef = useRef<any>(null)
  const productsWithCoords = products.filter(p => p.latitude != null && p.longitude != null)

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

  if (productsWithCoords.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <h3>No products with location data</h3>
        <p>Products with coordinates will appear on this map</p>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
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
          <Marker
            key={product.id}
            position={product.isGlobal ? [39.8283, -98.5795] : [product.latitude!, product.longitude!]}
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
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
