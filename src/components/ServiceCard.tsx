'use client'

import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'

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
  const cat = service.category as ServiceCategory
  const icon = SERVICE_CATEGORY_ICONS[cat] || '📋'
  const label = SERVICE_CATEGORY_LABELS[cat] || cat

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
      {service.imageUrl ? (
        <img
          src={service.imageUrl}
          alt={service.title}
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
          {service.price != null && (
            <span style={{
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)',
              marginLeft: 'auto'
            }}>
              ${service.price}
            </span>
          )}
        </div>
        <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
          {service.title}
        </h3>
        {service.description && (
          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {service.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          <span>🕐 {formatDuration(service.duration)}</span>
          {service.location && <span>📍 {service.location}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
          {service.user.image ? (
            <img src={service.user.image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>
              {(service.user.name || 'U')[0]}
            </span>
          )}
          <span>{service.user.name || 'Anonymous'}</span>
        </div>
      </div>
    </div>
  )
}
