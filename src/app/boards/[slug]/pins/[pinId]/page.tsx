'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { getEntityIcon } from '@/lib/entity-icons'
import EntityActions from '@/components/EntityActions'
import Breadcrumbs from '@/components/Breadcrumbs'
import Skeleton from '@/components/Skeleton'
import AddToCalendar from '@/components/AddToCalendar'

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })

interface PinDetail {
  id: string
  title: string | null
  content: string | null
  images: string | null
  entityType: string | null
  entityId: string | null
  entityTitle: string | null
  entityImage: string | null
  category: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  latitude?: number | null
  longitude?: number | null
  likeCount: number
  commentCount: number
  user: { id: string; name: string | null; image: string | null }
  board: { id: string; name: string; slug: string }
  createdAt: string
}

function getEntityHref(type: string | null, id: string | null): string {
  if (!type || !id) return '#'
  const map: Record<string, string> = {
    USER: '/profile/', PRODUCT: '/products/', SERVICE: '/services/',
    SHOP: '/shop/', EVENT: '/events/', GROUP: '/groups/',
    PROJECT: '/projects/', REQUEST: '/requests/', POST: '/posts/',
  }
  return map[type] ? `${map[type]}${id}` : '#'
}

export default function PinDetailPage() {
  const params = useParams()
  const slug = params?.slug as string
  const pinId = params?.pinId as string
  const [pin, setPin] = useState<PinDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [fullImg, setFullImg] = useState<string | null>(null)
  const [eventData, setEventData] = useState<any>(null)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') import('leaflet').then(mod => setL(mod))
  }, [])

  useEffect(() => {
    if (!slug || !pinId) return
    fetch(`/api/boards/${slug}/pins/${pinId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { const d = data?.data || data; setPin(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, pinId])

  useEffect(() => {
    if (!pin || pin.entityType !== 'EVENT' || !pin.entityId) return
    fetch(`/api/events/${pin.entityId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { const d = data?.data || data; setEventData(d) })
      .catch(() => {})
  }, [pin])

  if (loading) return <div className="landing" style={{ padding: 32 }}><Skeleton width="100%" height="200px" /></div>
  if (!pin) return <div className="landing" style={{ padding: 32, textAlign: 'center' }}><h2>Pin not found</h2><Link href={`/boards/${slug}`}>← Back to Board</Link></div>

  const images: string[] = pin.images ? JSON.parse(pin.images) : []
  const catColors: Record<string, string> = {
    LOST_FOUND: '#ef4444', PROMOTION: '#3b82f6', EVENT: '#8b5cf6',
    SERVICE: '#22c55e', HOUSING: '#ec4899', JOBS: '#14b8a6', FREE: '#22c55e', GENERAL: '#6b7280',
  }
  const isEvent = pin.entityType === 'EVENT' && pin.entityId && eventData

  return (
    <div className="landing" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
      {fullImg && (
        <div onClick={() => setFullImg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <img src={fullImg} alt="" style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}

      <Breadcrumbs items={[
        { label: 'Home', href: '/' },
        { label: 'Boards', href: '/boards' },
        { label: pin.board.name, href: `/boards/${pin.board.slug}` },
        { label: pin.title || 'Pin' },
      ]} />

      <Link href={`/boards/${pin.board.slug}`} style={{ display: 'inline-block', marginBottom: 16, color: 'var(--accent-primary)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to {pin.board.name}</Link>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {pin.user.image ? (
            <Image src={pin.user.image} alt="" width={32} height={32} style={{ borderRadius: '50%' }} />
          ) : (
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>{pin.user.name?.[0] || 'U'}</span>
          )}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pin.user.name || 'Unknown'}</span>
          <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 10, background: `${catColors[pin.category || 'GENERAL']}20`, color: catColors[pin.category || 'GENERAL'], fontWeight: 600 }}>
            {(pin.category || 'GENERAL').replace('_', ' ')}
          </span>
        </div>

        {pin.title && <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{pin.title}</h1>}
        {pin.content && <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{pin.content}</p>}

        {images.length > 0 && (
          <div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
            <img
              src={images[imgIdx]}
              alt=""
              onClick={() => setFullImg(images[imgIdx])}
              style={{ width: '100%', maxHeight: 500, objectFit: 'contain', background: '#111', display: 'block' }}
            />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 6, padding: 8, overflowX: 'auto', background: 'var(--bg-primary)' }}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" onClick={(e) => { e.stopPropagation(); setImgIdx(i) }} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', opacity: i === imgIdx ? 1 : 0.5, border: i === imgIdx ? '2px solid var(--accent-primary)' : 'none' }} />
                ))}
              </div>
            )}
          </div>
        )}

        {pin.entityType && pin.entityId && (
          <Link href={getEntityHref(pin.entityType, pin.entityId)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, textDecoration: 'none', color: 'var(--text-primary)' }}>
            {pin.entityImage ? <img src={pin.entityImage} alt="" style={{ width: 40, height: 40, borderRadius: 4, objectFit: 'cover' }} /> : <span style={{ fontSize: '1.3rem' }}>{getEntityIcon(pin.entityType)}</span>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{pin.entityType.replace('_', ' ')}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pin.entityTitle || 'View →'}</div>
            </div>
          </Link>
        )}

        {isEvent && eventData && (
          <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontWeight: 600 }}>📅 {eventData.title}</div>
            {eventData.eventDate && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(eventData.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
            {eventData.location && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 {eventData.location}</div>}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>👥 {eventData._count?.eventJoiners || eventData.joiners?.length || 0} attending</span>
              {eventData.eventDate && (
                <AddToCalendar params={{
                  title: eventData.title,
                  description: eventData.description || undefined,
                  location: eventData.location || undefined,
                  startTime: eventData.eventDate,
                  endTime: eventData.endDate || eventData.eventDate,
                }} variant="link" />
              )}
            </div>
          </div>
        )}

        {(pin.latitude && pin.longitude && L) && (
          <div style={{ borderRadius: 12, overflow: 'hidden', height: 250 }}>
            <MapContainer center={[pin.latitude, pin.longitude]} zoom={14} style={{ height: 250, width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[pin.latitude, pin.longitude]}>
                <Popup>{pin.title || 'Pin location'}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {(pin.contactName || pin.contactEmail || pin.contactPhone) && (
          <div style={{ padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: '0.85rem' }}>
            <strong>Contact</strong>
            {pin.contactName && <div>{pin.contactName}</div>}
            {pin.contactEmail && <a href={`mailto:${pin.contactEmail}`} style={{ color: 'var(--accent-primary)' }}>{pin.contactEmail}</a>}
            {pin.contactPhone && <div>{pin.contactPhone}</div>}
          </div>
        )}

        <EntityActions
          entityType={pin.entityType && ['PRODUCT','EVENT','SERVICE','PROJECT','GROUP','REQUEST','SHOP'].includes(pin.entityType) ? pin.entityType as any : 'PRODUCT'}
          entityId={pin.entityId || pin.id}
          title={pin.title || 'Pin'}
          authorId={pin.user.id}
          description={pin.content || undefined}
          image={images[0] || undefined}
          initialLikes={pin.likeCount || 0}
          replyCount={pin.commentCount || 0}
          shareUrl={typeof window !== 'undefined' ? `${window.location.origin}/boards/${pin.board.slug}/pins/${pin.id}` : undefined}
          variant="full"
        />

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span>Pinned {new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} on <Link href={`/boards/${pin.board.slug}`} style={{ color: 'var(--accent-primary)' }}>{pin.board.name}</Link></span>
        </div>
      </div>
    </div>
  )
}
