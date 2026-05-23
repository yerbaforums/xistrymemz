'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import styles from './page.module.css'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export default function ServiceDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [service, setService] = useState<ServiceOffering | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/services/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setService(data.service || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.id])

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}>Loading...</div></div>
  }

  if (!service) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Service not found</h2>
          <p>The service you're looking for doesn't exist or has been removed.</p>
          <Link href="/services" className={styles.backBtn}>Browse Services</Link>
        </div>
      </div>
    )
  }

  const cat = service.category as ServiceCategory

  return (
    <div className={styles.page}>
      <Link href="/services" className={styles.breadcrumb}>← Back to Services</Link>

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          {service.imageUrl ? (
            <img src={service.imageUrl} alt={service.title} className={styles.heroImage} />
          ) : (
            <div className={styles.heroPlaceholder}>
              {SERVICE_CATEGORY_ICONS[cat] || '📋'}
            </div>
          )}

          <div className={styles.metaRow}>
            <span className={styles.categoryBadge}>
              {SERVICE_CATEGORY_ICONS[cat]} {SERVICE_CATEGORY_LABELS[cat]}
            </span>
            <span className={styles.durationBadge}>🕐 {formatDuration(service.duration)}</span>
          </div>

          <h1 className={styles.title}>{service.title}</h1>

          {service.description && (
            <p className={styles.description}>{service.description}</p>
          )}

          <div className={styles.detailsGrid}>
            {service.price != null && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>💰</div>
                <div className={styles.detailLabel}>Price</div>
                <div className={styles.detailValue}>${service.price}</div>
              </div>
            )}
            {service.location && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📍</div>
                <div className={styles.detailLabel}>Location</div>
                <div className={styles.detailValue}>{service.location}</div>
              </div>
            )}
            {service.meetingLink && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🔗</div>
                <div className={styles.detailLabel}>Meeting Link</div>
                <div className={styles.detailValue}>
                  <a href={service.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                    {service.meetingLink}
                  </a>
                </div>
              </div>
            )}
            <div className={styles.detailCard}>
              <div className={styles.detailIcon}>🕐</div>
              <div className={styles.detailLabel}>Duration</div>
              <div className={styles.detailValue}>{formatDuration(service.duration)}</div>
            </div>
          </div>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sellerCard}>
            <div className={styles.sellerInfo}>
              {service.user.image ? (
                <img src={service.user.image} alt="" className={styles.sellerAvatar} />
              ) : (
                <div className={styles.sellerAvatarPlaceholder}>
                  {(service.user.name || 'U')[0]}
                </div>
              )}
              <div>
                <div className={styles.sellerName}>{service.user.name || 'Anonymous'}</div>
                {service.user.username && (
                  <Link href={`/profile/${service.user.username}`} className={styles.sellerUsername}>
                    @{service.user.username}
                  </Link>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowBooking(true)}
              className={styles.bookBtn}
              disabled={!session}
            >
              {session ? '📅 Book This Service' : 'Sign in to Book'}
            </button>

            {!session && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: '8px 0 0', textAlign: 'center' }}>
                <Link href="/auth/login" style={{ color: 'var(--accent-primary)' }}>Sign in</Link> to book this service
              </p>
            )}
          </div>
        </aside>
      </div>

      {showBooking && (
        <BookAppointmentModal
          isOpen={true}
          onClose={() => setShowBooking(false)}
          sellerId={service.userId}
          sellerName={service.user.name}
          defaultDuration={service.duration}
          defaultLocation={service.location}
          defaultMeetingLink={service.meetingLink}
          serviceCategory={service.category}
          serviceOfferingId={service.id}
          productTitle={service.title}
        />
      )}
    </div>
  )
}
