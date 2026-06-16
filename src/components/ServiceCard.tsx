'use client'

import { memo } from 'react'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import ViewCount from '@/components/ViewCount'
import Link from 'next/link'
import styles from './ServiceCard.module.css'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

interface ServiceCardProps {
  service: ServiceOffering
  onClick?: () => void
  style?: React.CSSProperties
}

const ServiceCard = memo(function ServiceCard({ service, onClick, style }: ServiceCardProps) {
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
  const hashtags: { hashtag: { tag: string } }[] = Array.isArray((service as any).hashtags) ? (service as any).hashtags : []

  return (
    <div onClick={onClick} className={styles.card} style={style}>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className={styles.image} />
      ) : (
        <div className={styles.imagePlaceholder}>{icon}</div>
      )}
      <div className={styles.body}>
        <div className={styles.topRow}>
          <span className={styles.categoryBadge}>{icon} {label}</span>
          {price != null && <span className={styles.price}>${price}</span>}
        </div>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
        {hashtags.length > 0 && (
          <div className={styles.hashtags}>
            {hashtags.map((h, i) => (
              <Link key={i} href={`/hashtag/${h.hashtag?.tag}`} className={styles.hashtag} onClick={e => e.stopPropagation()}>#{h.hashtag?.tag}</Link>
            ))}
          </div>
        )}
        <div className={styles.meta}>
          <span>🕐 {formatDuration(duration)}</span>
          {location && <span>📍 {location}</span>}
          <ViewCount count={viewCount} />
        </div>
        <div className={styles.author}>
          {userImage ? (
            <img src={userImage} alt="" className={styles.authorAvatar} />
          ) : (
            <span className={styles.authorInitials}>{(userName || 'U')[0]}</span>
          )}
          <span>{userName || 'Anonymous'}</span>
        </div>
        <div className={styles.footer}>
          <button
            onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/services/${service.id}`) }}
            className={styles.copyBtn}
            title="Copy link"
          >
            🔗
          </button>
        </div>
      </div>
    </div>
  )
})

export default ServiceCard
