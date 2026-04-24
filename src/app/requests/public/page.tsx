'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import styles from './page.module.css'
import { calculateDistance, geocodeLocation } from '@/lib/geocoding'
import { useToast } from '@/context/ToastContext'

import dynamic from 'next/dynamic'

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const leaflet = require('leaflet')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Icon: any = leaflet.Icon.Default.prototype
  delete Icon._getIconUrl
  leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  category: string
  priority: string
  budget: number | null
  location: string | null
  latitude: number | null
  longitude: number | null
  likes: number
  reposts: number
  createdAt: string
  plan: { id: string; title: string } | null
  group: { id: string; name: string } | null
  product: { id: string; title: string } | null
  schoolContent: { id: string; title: string } | null
  event: { id: string; title: string } | null
  user: { id: string; name: string | null; email: string; image: string | null }
}

export default function PublicRequestsPage() {
  const { warning } = useToast()
  const [requests, setRequests] = useState<Request[]>([])
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([])
  const [status, setStatus] = useState('ALL')
  const [category, setCategory] = useState('ALL')
  const [linkType, setLinkType] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const [location, setLocation] = useState('ALL')
  const [zipCode, setZipCode] = useState('')
  const [radius, setRadius] = useState('25')
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)

  const fetchRequests = useCallback(() => {
    fetch('/api/requests?public=true')
      .then(res => res.json())
      .then(data => {
        setRequests(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    let result = requests

    if (status !== 'ALL') {
      result = result.filter(r => r.status === status)
    }
    if (category !== 'ALL') {
      result = result.filter(r => r.category === category)
    }
    if (priority !== 'ALL') {
      result = result.filter(r => r.priority === priority)
    }
    if (linkType !== 'ALL') {
      switch (linkType) {
        case 'PLAN': result = result.filter(r => r.plan); break
        case 'GROUP': result = result.filter(r => r.group); break
        case 'PRODUCT': result = result.filter(r => r.product); break
        case 'SCHOOL': result = result.filter(r => r.schoolContent); break
        case 'EVENT': result = result.filter(r => r.event); break
        case 'NONE': result = result.filter(r => !r.plan && !r.group && !r.product && !r.schoolContent && !r.event); break
      }
    }
    if (location !== 'ALL') {
      result = result.filter(r => r.location === location)
    }
    if (userLocation && radius) {
      const radiusMiles = parseInt(radius)
      result = result.filter(r => {
        if (r.latitude == null || r.longitude == null) return true
        const distance = calculateDistance(userLocation.lat, userLocation.lon, r.latitude, r.longitude)
        return distance <= radiusMiles
      })
    }

    setFilteredRequests(result)
  }, [requests, status, category, priority, linkType, location, userLocation, radius])

  const geocodeZipCode = async () => {
    if (!zipCode.trim()) {
      setUserLocation(null)
      return
    }
    setGeocodingLoading(true)
    try {
      const result = await geocodeLocation(zipCode)
      if (result) {
        setUserLocation({ lat: result.latitude, lon: result.longitude })
      } else {
        warning('Could not find location')
        setUserLocation(null)
      }
    } catch (err) {
      console.error(err)
      setUserLocation(null)
    } finally {
      setGeocodingLoading(false)
    }
  }

  const categories = [...new Set(requests.map(r => r.category).filter(Boolean))]
  const locations = [...new Set(requests.map(r => r.location).filter(Boolean))]

  const requestsWithCoords = filteredRequests.filter(r => r.latitude != null && r.longitude != null)
  const center: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lon]
    : requestsWithCoords.length > 0 && requestsWithCoords[0].latitude
      ? [requestsWithCoords[0].latitude!, requestsWithCoords[0].longitude!]
      : [39.8283, -98.5795]

  const getLinkInfo = (req: Request) => {
    if (req.plan) return { type: 'Plan', label: req.plan.title, href: `/plans/${req.plan.id}`, color: '#00d9ff' }
    if (req.group) return { type: 'Group', label: req.group.name, href: `/groups/${req.group.id}`, color: '#a855f7' }
    if (req.product) return { type: 'Product', label: req.product.title, href: `/products/${req.product.id}`, color: '#22c55e' }
    if (req.schoolContent) return { type: 'School', label: req.schoolContent.title, href: `/schools`, color: '#f59e0b' }
    if (req.event) return { type: 'Event', label: req.event.title, href: `/events/${req.event.id}`, color: '#ef4444' }
    return null
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Public Requests</h1>
          <p className={styles.subtitle}>Discover and fulfill requests from the community</p>
        </div>
        <Link href="/requests" className="btn-primary">+ Create Request</Link>
      </div>

      <div className={styles.filters}>
        <select value={status} onChange={e => setStatus(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat!}>{cat}</option>
          ))}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
        <select value={linkType} onChange={e => setLinkType(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Links</option>
          <option value="PLAN">Plan</option>
          <option value="GROUP">Group</option>
          <option value="PRODUCT">Product</option>
          <option value="SCHOOL">School</option>
          <option value="EVENT">Event</option>
          <option value="NONE">Standalone</option>
        </select>
        <select value={location} onChange={e => setLocation(e.target.value)} className={styles.filterSelect}>
          <option value="ALL">All Locations</option>
          {locations.map(loc => (
            <option key={loc} value={loc!}>{loc}</option>
          ))}
        </select>
        <div className={styles.zipFilter}>
          <input
            type="text"
            value={zipCode}
            onChange={e => setZipCode(e.target.value)}
            placeholder="Zip code"
            className={styles.zipInput}
            onKeyDown={e => e.key === 'Enter' && geocodeZipCode()}
          />
          <select 
            value={radius} 
            onChange={e => setRadius(e.target.value)} 
            className={styles.radiusSelect}
            disabled={!userLocation}
          >
            <option value="5">5 mi</option>
            <option value="10">10 mi</option>
            <option value="25">25 mi</option>
            <option value="50">50 mi</option>
            <option value="100">100 mi</option>
          </select>
          <button onClick={geocodeZipCode} className={styles.zipBtn} disabled={geocodingLoading}>
            {geocodingLoading ? '...' : 'Go'}
          </button>
        </div>
      </div>

      {requestsWithCoords.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div className={styles.mapSection} style={{ width: '350px', height: '350px', flexShrink: 0 }}>
            <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {requestsWithCoords.map(req => (
                <Marker 
                  key={req.id} 
                  position={[req.latitude!, req.longitude!]}
                  eventHandlers={{ click: () => setSelectedRequest(req) }}
                >
                  <Popup>
                    <div style={{ minWidth: 150 }}>
                      <strong>{req.title}</strong>
                      <br />
                      {req.budget && `$${req.budget}`}
                      <br />
                      {req.location}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className={styles.empty}>
          <p>No requests found</p>
          <Link href="/requests" className="btn-primary">Create Request</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredRequests.map(req => {
            const link = getLinkInfo(req)
            return (
              <div 
                key={req.id} 
                className={`${styles.card} ${selectedRequest?.id === req.id ? styles.selected : ''}`}
                onClick={() => setSelectedRequest(req)}
              >
                <div className={styles.cardHeader}>
                  <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                  <span className={`badge badge-${req.priority.toLowerCase()}`}>{req.priority}</span>
                </div>
                <Link href={`/requests/${req.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h3>{req.title}</h3>
                </Link>
                {req.description && <p className={styles.desc}>{req.description}</p>}
                <div className={styles.cardMeta}>
                  {link && (
                    <Link href={link.href} className={styles.linkBadge} style={{ backgroundColor: link.color + '20', color: link.color }}>
                      {link.type}: {link.label}
                    </Link>
                  )}
                  {!link && <span className={styles.planName}>Standalone</span>}
                </div>
                <div className={styles.cardMeta}>
                  {req.budget && <span>💰 ${req.budget}</span>}
                  {req.location && <span>📍 {req.location}</span>}
                  <span>{req.category}</span>
                </div>
                <div className={styles.cardFooter}>
                  <span>👤 {req.user.name || req.user.email}</span>
                  <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                </div>
                <Link href={`/requests/${req.id}`} className={styles.cardLink}>View Details →</Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}