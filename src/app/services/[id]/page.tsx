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

  const category = typeof service.category === 'string' ? service.category : 'OTHER'
  const cat = category as ServiceCategory
  const hashtags = Array.isArray(service.hashtags) ? service.hashtags.filter(h => h?.hashtag?.tag && typeof h.hashtag.tag === 'string') : []
  const acceptsAppointments = service.acceptsAppointments === true
  const formFields: FormField[] = Array.isArray(service.appointmentFormFields)
    ? service.appointmentFormFields.filter((f: any) => f && typeof f === 'object' && typeof f.label === 'string')
    : []
  const duration = typeof service.duration === 'number' ? service.duration : 60
  const price = typeof service.price === 'number' ? service.price : null
  const title = typeof service.title === 'string' ? service.title : 'Untitled'
  const description = typeof service.description === 'string' ? service.description : null
  const imageUrl = typeof service.imageUrl === 'string' ? service.imageUrl : null
  const location = typeof service.location === 'string' ? service.location : null
  const meetingLink = typeof service.meetingLink === 'string' ? service.meetingLink : null
  const apptDuration = typeof service.appointmentDuration === 'number' ? service.appointmentDuration : null
  const apptLeadTime = typeof service.appointmentLeadTime === 'number' ? service.appointmentLeadTime : null
  const apptLocation = typeof service.appointmentLocation === 'string' ? service.appointmentLocation : null
  const apptMeetingLink = typeof service.appointmentMeetingLink === 'string' ? service.appointmentMeetingLink : null
  const viewCount = typeof service.viewCount === 'number' ? service.viewCount : 0
  const userName = typeof service.user?.name === 'string' ? service.user.name : null
  const userImage = typeof service.user?.image === 'string' ? service.user.image : null
  const userUsername = typeof service.user?.username === 'string' ? service.user.username : null

  useRecordView('service', typeof service.id === 'string' ? service.id : '')

  return (
    <div className={styles.page}>
      <Link href="/services" className={styles.breadcrumb}>← Back to Services</Link>

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className={styles.heroImage} />
          ) : (
            <div className={styles.heroPlaceholder}>
              {SERVICE_CATEGORY_ICONS[cat] || '📋'}
            </div>
          )}

          <div className={styles.metaRow}>
            <span className={styles.categoryBadge}>
              {SERVICE_CATEGORY_ICONS[cat] || '📋'} {SERVICE_CATEGORY_LABELS[cat] || 'Other'}
            </span>
            <span className={styles.durationBadge}>🕐 {formatDuration(duration)}</span>
            <ViewCount count={viewCount} />
          </div>

          <h1 className={styles.title}>{title}</h1>

          {description && (
            <p className={styles.description}>{description}</p>
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
            {price != null && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>💰</div>
                <div className={styles.detailLabel}>Price</div>
                <div className={styles.detailValue}>${price}</div>
              </div>
            )}
            {location && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📍</div>
                <div className={styles.detailLabel}>Location</div>
                <div className={styles.detailValue}>{location}</div>
              </div>
            )}
            {meetingLink && (
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🔗</div>
                <div className={styles.detailLabel}>Meeting Link</div>
                <div className={styles.detailValue}>
                  <a href={meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                    {meetingLink}
                  </a>
                </div>
              </div>
            )}
            <div className={styles.detailCard}>
              <div className={styles.detailIcon}>🕐</div>
              <div className={styles.detailLabel}>Duration</div>
              <div className={styles.detailValue}>{formatDuration(duration)}</div>
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
                    <div className={styles.detailValue}>{formatDuration(apptDuration || 60)}</div>
                  </div>
                )}
                {apptLeadTime != null && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>⏳</div>
                    <div className={styles.detailLabel}>Lead Time</div>
                    <div className={styles.detailValue}>{String(apptLeadTime)}h minimum</div>
                  </div>
                )}
                {apptLocation && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>📍</div>
                    <div className={styles.detailLabel}>Appointment Location</div>
                    <div className={styles.detailValue}>{apptLocation}</div>
                  </div>
                )}
                {apptMeetingLink && (
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>💻</div>
                    <div className={styles.detailLabel}>Virtual Meeting Link</div>
                    <div className={styles.detailValue}>
                      <a href={apptMeetingLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)', wordBreak: 'break-all' }}>
                        {apptMeetingLink}
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
            title={title}
            description={description}
            referenceType="SERVICE"
            referenceId={service.id}
            referenceTitle={title}
            referenceImage={imageUrl}
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sellerCard}>
            <div className={styles.sellerInfo}>
              {userImage ? (
                <img src={userImage} alt="" className={styles.sellerAvatar} />
              ) : (
                <div className={styles.sellerAvatarPlaceholder}>
                  {(userName || 'U')[0]}
                </div>
              )}
              <div>
                <div className={styles.sellerName}>{userName || 'Anonymous'}</div>
                {userUsername && (
                  <Link href={`/profile/${userUsername}`} className={styles.sellerUsername}>
                    @{userUsername}
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
          sellerName={userName}
          defaultDuration={apptDuration || duration}
          defaultLocation={apptLocation || location}
          defaultMeetingLink={apptMeetingLink || meetingLink}
          serviceCategory={category}
          serviceOfferingId={service.id}
          productTitle={title}
        />
      )}
    </div>
  )
}