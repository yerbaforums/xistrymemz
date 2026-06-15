'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getEntityIcon } from '@/lib/entity-icons'
import EntityActions from '@/components/EntityActions'
import Breadcrumbs from '@/components/Breadcrumbs'
import Skeleton from '@/components/Skeleton'

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

  useEffect(() => {
    if (!slug || !pinId) return
    fetch(`/api/boards/${slug}/pins/${pinId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setPin(data?.data || data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug, pinId])

  if (loading) return <div className="landing" style={{ padding: 32 }}><Skeleton width="100%" height="200px" /></div>
  if (!pin) return <div className="landing" style={{ padding: 32, textAlign: 'center' }}><h2>Pin not found</h2><Link href={`/boards/${slug}`}>← Back to Board</Link></div>

  const images: string[] = pin.images ? JSON.parse(pin.images) : []
  const catColors: Record<string, string> = {
    LOST_FOUND: '#ef4444', PROMOTION: '#3b82f6', EVENT: '#8b5cf6',
    SERVICE: '#22c55e', HOUSING: '#ec4899', JOBS: '#14b8a6', FREE: '#22c55e', GENERAL: '#6b7280',
  }

  return (
    <div className="landing" style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px 60px' }}>
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
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            <Image src={images[imgIdx]} alt="" width={800} height={400} style={{ width: '100%', height: 300, objectFit: 'cover' }} />
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 6, padding: 8, overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <img key={i} src={img} alt="" onClick={() => setImgIdx(i)} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', opacity: i === imgIdx ? 1 : 0.5, border: i === imgIdx ? '2px solid var(--accent-primary)' : 'none' }} />
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

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Pinned {new Date(pin.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} on <Link href={`/boards/${pin.board.slug}`} style={{ color: 'var(--accent-primary)' }}>{pin.board.name}</Link>
        </div>
      </div>
    </div>
  )
}
