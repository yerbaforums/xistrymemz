'use client'

import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import ViewCount from '@/components/ViewCount'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

interface ServiceCardProps {
  service: ServiceOffering
  onClick: () => void
  style?: React.CSSProperties
}

export default function ServiceCard({ service, onClick, style }: ServiceCardProps) {
  const cat = (typeof service.category === 'string' ? service.category : 'OTHER') as ServiceCategory
  const icon = SERVICE_CATEGORY_ICONS[cat] || '📋'
  const label = SERVICE_CATEGORY_LABELS[cat] || 'Other'
  const title = typeof service.title === 'string' ? service.title : 'Untitled'
  const description = typeof service.description === 'string' ? service.description : null
  const imageUrl = typeof service.imageUrl === 'string' ? service.imageUrl : null
  const price = typeof service.price === 'number' ? service.price : null
  const duration = typeof service.duration === 'number' ? service.duration : 60
  const location = typeof service.location === 'string' ? service.location : null
  const viewCount = typeof service.viewCount === 'number' ? service.viewCount : 0
  const userName = typeof service.user?.name === 'string' ? service.user.name : null
  const userImage = typeof service.user?.image === 'string' ? service.user.image : null

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', height: 160, objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '100%', height: 120, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '2.5rem', background: 'var(--bg-tertiary)',
          color: 'var(--text-tertiary)'
        }}>
          {icon}
        </div>
      )}
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6,
            background: 'var(--accent-primary)15',
            color: 'var(--accent-primary)', fontWeight: 600,
            whiteSpace: 'nowrap'
          }}>
            {icon} {label}
          </span>
          {price != null && (
            <span style={{
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
              marginLeft: 'auto'
            }}>
              ${price}
            </span>
          )}
        </div>
        <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {description && (
          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          <span>🕐 {formatDuration(duration)}</span>
          {location && <span>📍 {location}</span>}
          <ViewCount count={viewCount} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          {userImage ? (
            <img src={userImage} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
              {(userName || 'U')[0]}
            </span>
          )}
          <span>{userName || 'Anonymous'}</span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/services/${service.id}`) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4, fontSize: '0.8rem' }}
            title="Copy link"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  )
}