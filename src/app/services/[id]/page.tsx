'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import ShareSection from '@/components/ShareSection'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import ViewCount from '@/components/ViewCount'
import { useRecordView } from '@/hooks/useRecordView'
import styles from './page.module.css'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

interface FormField {
  label: string
  type: string
  required: boolean
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
  const hashtags = Array.isArray(service.hashtags) ? service.hashtags.filter(h => h?.hashtag?.tag) : []
  const acceptsAppointments = service.acceptsAppointments === true
  const formFields: FormField[] = Array.isArray(service.appointmentFormFields)
    ? service.appointmentFormFields.filter((f: any) => f && typeof f.label === 'string')
    : []

  useRecordView('service', service?.id || '')

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
            <ViewCount count={service.viewCount || 0} />
          </div>

          <h1 className={styles.title}>{service.title}</h1>

          {service.description && (
            <p className={styles.description}>{service.description}</p>
          )}

          {hashtags.length > 0 && (
            <div className={styles.hashtags}>
              {hashtags.map(h => (
                <Link key={h.id} href={`/search?tag=${encodeURIComponent(h.hashtag.tag)}`} className={styles.hashtag}>
                  #{h.hashtag.tag}
                </Link>
              ))}
            </div>
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

          {acceptsAppointments && (
            <div className={styles.appointmentSection}>
              <h3 className={styles.sectionTitle}>📅 Appointment Scheduling</h3>
              <div className={styles.detailsGrid}>
                {service.appointmentDuration && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>⏱️</div>
                    <div className={styles.detailLabel}>Session Duration</div>
                    <div className={styles.detailValue}>{formatDuration(service.appointmentDuration)}</div>
                  </div>
                )}
                {service.appointmentLeadTime != null && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>⏳</div>
                    <div className={styles.detailLabel}>Lead Time</div>
                    <div className={styles.detailValue}>{String(service.appointmentLeadTime)}h minimum</div>
                  </div>
                )}
                {service.appointmentLocation && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>📍</div>
                    <div className={styles.detailLabel}>Appointment Location</div>
                    <div className={styles.detailValue}>{service.appointmentLocation}</div>
                  </div>
                )}
                {service.appointmentMeetingLink && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>💻</div>
                    <div className={styles.detailLabel}>Virtual Meeting Link</div>
                    <div className={styles.detailValue}>
                      <a href={service.appointmentMeetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                        {service.appointmentMeetingLink}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              {formFields.length > 0 && (
                <div className={styles.formFieldsInfo}>
                  <p className={styles.formFieldsLabel}>Booking form includes:</p>
                  <ul className={styles.formFieldsList}>
                    {formFields.map((field, idx) => (
                      <li key={idx}>
                        {String(field.label)} {field.required && <span style={{ color: 'var(--accent-primary)' }}>*</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <ShareSection
            title={service.title}
            description={service.description}
            referenceType="SERVICE"
            referenceId={service.id}
            referenceTitle={service.title}
            referenceImage={service.imageUrl}
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sellerCard}>
            <div className={styles.sellerInfo}>
              {service.user?.image ? (
                <img src={service.user.image} alt="" className={styles.sellerAvatar} />
              ) : (
                <div className={styles.sellerAvatarPlaceholder}>
                  {(service.user?.name || 'U')[0]}
                </div>
              )}
              <div>
                <div className={styles.sellerName}>{service.user?.name || 'Anonymous'}</div>
                {service.user?.username && (
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
          sellerName={service.user?.name}
          defaultDuration={service.appointmentDuration || service.duration}
          defaultLocation={service.appointmentLocation || service.location}
          defaultMeetingLink={service.appointmentMeetingLink || service.meetingLink}
          serviceCategory={service.category}
          serviceOfferingId={service.id}
          productTitle={service.title}
        />
      )}
    </div>
  )
}