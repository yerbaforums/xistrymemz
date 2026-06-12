'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import styles from './HomeMap.module.css'
import { useTheme } from '@/context/ThemeContext'
import { MapContainer, TileLayer, Marker, Popup } from '@/components/LeafletComponents'


const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const LIGHT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const DARK_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
const LIGHT_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

interface MapItem {
  id: string
  type: string
  title: string
  lat: number
  lng: number
  url: string
  image: string | null
  meta: string | undefined
}

const TYPE_ICONS: Record<string, string> = {
  product: '🛒',
  event: '📅',
  plan: '🚀',
  request: '📝',
  shop: '🏪',
}

function calculateCenter(items: MapItem[]): [number, number] {
  if (items.length === 0) return [20, 0]
  const lats = items.map(i => i.lat)
  const lngs = items.map(i => i.lng)
  return [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ]
}

export default function HomeMap() {
  const t = useTranslations('homeMap')
  const { mode } = useTheme()
  const [items, setItems] = useState<MapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    fetchApi<{ items: MapItem[] }>('/api/map-data')
      .then(({ items }) => setItems(items || []))
      .catch(() => setLoading(false))
      .finally(() => setLoading(false))
  }, [])

  const center = calculateCenter(items)

  if (!mounted) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.subtitle}>{t('subtitle')}</p>
      <div className={styles.mapWrap}>
        {loading ? (
          <div className={styles.loading}>{t('loading')}</div>
        ) : items.length === 0 ? (
          <div className={styles.loading}>{t('noLocations')}</div>
        ) : (
          <MapContainer center={center} zoom={3} className={styles.map} scrollWheelZoom={false}>
            <TileLayer
              attribution={mode === 'dark' ? DARK_ATTR : LIGHT_ATTR}
              url={mode === 'dark' ? DARK_TILE_URL : LIGHT_TILE_URL}
            />
            {items.map(item => (
              <Marker key={`${item.type}-${item.id}`} position={[item.lat, item.lng]}>
                <Popup>
                  <div className={styles.popup}>
                    <span className={styles.popupIcon}>{TYPE_ICONS[item.type] || '📍'}</span>
                    <a href={item.url} className={styles.popupTitle}>{item.title}</a>
                    {item.meta && <span className={styles.popupMeta}>{item.meta}</span>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
      <p className={styles.footer}>{t('footer', { count: items.length })}</p>
    </section>
  )
}
