'use client'

import { useState, useEffect, Component } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BookAppointmentModal from '@/components/BookAppointmentModal'
import EntityActions from '@/components/EntityActions'
import Button from '@/components/ui/Button'
import type { ServiceOffering, ServiceCategory } from '@/types/service'
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ICONS } from '@/types/service'
import ViewCount from '@/components/ViewCount'
import { useRecordView } from '@/hooks/useRecordView'
import TranslateButton from '@/components/TranslateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import styles from './page.module.css'
import Skeleton, { SkeletonCard } from '@/components/Skeleton'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import Breadcrumbs from '@/components/Breadcrumbs'

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function safeStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

function safeNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null
}

function safeBool(v: unknown): boolean {
  return v === true
}

function sanitizeService(raw: any): ServiceOffering | null {
  if (!raw || typeof raw !== 'object') return null
  try {
    const h = Array.isArray(raw.hashtags)
      ? raw.hashtags.filter((x: any) => x?.hashtag?.tag && typeof x.hashtag.tag === 'string').map((x: any) => ({
          id: String(x.id ?? ''),
          hashtag: { id: String(x.hashtag.id ?? ''), tag: String(x.hashtag.tag) }
        }))
      : []

    const ff: { label: string; type: string; required: boolean }[] = Array.isArray(raw.appointmentFormFields)
      ? raw.appointmentFormFields.filter((f: any) => f && typeof f === 'object' && typeof f.label === 'string').map((f: any) => ({
          label: String(f.label),
          type: String(f.type ?? 'text'),
          required: safeBool(f.required)
        }))
      : []

    return {
      id: String(raw.id ?? ''),
      title: String(raw.title ?? 'Untitled'),
      description: safeStr(raw.description),
      category: typeof raw.category === 'string' ? raw.category : 'OTHER',
      duration: typeof raw.duration === 'number' ? raw.duration : 60,
      price: safeNum(raw.price),
      location: safeStr(raw.location),
      meetingLink: safeStr(raw.meetingLink),
      imageUrl: safeStr(raw.imageUrl),
      isActive: safeBool(raw.isActive),
      userId: String(raw.userId ?? ''),
      user: raw.user && typeof raw.user === 'object' ? {
        id: String(raw.user.id ?? ''),
        name: safeStr(raw.user.name),
        image: safeStr(raw.user.image),
        username: safeStr(raw.user.username),
      } : { id: '', name: null, image: null, username: null },
      createdAt: String(raw.createdAt ?? ''),
      updatedAt: String(raw.updatedAt ?? ''),
      viewCount: typeof raw.viewCount === 'number' ? raw.viewCount : 0,
      acceptsAppointments: safeBool(raw.acceptsAppointments),
      appointmentDuration: safeNum(raw.appointmentDuration),
      appointmentLeadTime: safeNum(raw.appointmentLeadTime),
      appointmentLocation: safeStr(raw.appointmentLocation),
      appointmentMeetingLink: safeStr(raw.appointmentMeetingLink),
      appointmentFormFields: ff.length > 0 ? ff : null,
      hashtags: h,
    }
  } catch {
    return null
  }
}

interface FormField {
  label: string
  type: string
  required: boolean
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null as any }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          <div className={styles.errorState}>
            <h2>Something went wrong</h2>
            <p>We couldn&apos;t load this service. Please try again later.</p>
            <Link href="/services" className={styles.backBtn}>Browse Services</Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ServiceDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [service, setService] = useState<ServiceOffering | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBooking, setShowBooking] = useState(false)
  const [relatedServices, setRelatedServices] = useState<ServiceOffering[]>([])
  const [relatedLoading, setRelatedLoading] = useState(false)

  useEffect(() => {
    if (!params.id) return
    fetch(`/api/services/${params.id}`)
      .then(r => r.json())
      .then(data => {
        const svc = sanitizeService(data.service) || null
        setService(svc)
        setLoading(false)
        if (svc) {
          setRelatedLoading(true)
          const url = svc.category
            ? `/api/services?category=${encodeURIComponent(svc.category)}`
            : '/api/services'
          fetch(url)
            .then(r => r.json())
            .then(related => {
              const items = Array.isArray(related?.services)
                ? related.services.filter((s: ServiceOffering) => s.id !== svc.id).slice(0, 3)
                : []
              setRelatedServices(items)
              setRelatedLoading(false)
            })
            .catch(() => setRelatedLoading(false))
        }
      })
      .catch(() => setLoading(false))
  }, [params.id])

  useRecordView('service', service?.id || '')

  if (loading) {
    return <div className={styles.page}><SkeletonCard /></div>
  }

  if (!service) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Service not found</h2>
          <p>The service you&apos;re looking for doesn&apos;t exist or has been removed.</p>
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

  return (
    <ErrorBoundary>
      <div className={styles.page}>
        <Breadcrumbs items={[
          { label: 'Home', href: '/' },
          { label: 'Services', href: '/services' },
          { label: title || 'Service' },
        ]} />
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
              <>
                <p className={styles.description}>{description}</p>
                <TranslateButton text={description} />
              </>
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
                  {apptDuration != null && (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>⏱️</div>
                      <div className={styles.detailLabel}>Session Duration</div>
                      <div className={styles.detailValue}>{formatDuration(apptDuration)}</div>
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

            <EntityActions
              entityType="SERVICE"
              entityId={service.id}
              title={title}
              authorId={service.userId}
              image={imageUrl}
              variant="bar"
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

              <Button
                onClick={() => setShowBooking(true)}
                className={styles.bookBtn}
                variant="primary"
                disabled={!session}
              >
                {session ? '📅 Book This Service' : 'Sign in to Book'}
              </Button>

              {session && (
                <PinToBoardButton
                  entityType="SERVICE"
                  entityId={service.id}
                  entityTitle={title}
                  entityImage={imageUrl || undefined}
                  variant="ghost"
                  label="Pin to Board"
                />
              )}

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

        {relatedServices.length > 0 && (
          <div className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>Similar Services</h2>
            <div className={styles.relatedGrid}>
              {relatedServices.map(rs => (
                <Link key={rs.id} href={`/services/${rs.id}`} className={styles.relatedCard}>
                  {rs.imageUrl ? (
                    <div className={styles.relatedCardImage}>
                      <img src={rs.imageUrl} alt={rs.title} />
                    </div>
                  ) : (
                    <div className={styles.relatedCardImagePlaceholder}>
                      {SERVICE_CATEGORY_ICONS[rs.category as ServiceCategory] || '📋'}
                    </div>
                  )}
                  <div className={styles.relatedCardBody}>
                    <span className={styles.relatedCardType}>{SERVICE_CATEGORY_LABELS[rs.category as ServiceCategory] || rs.category}</span>
                    <span className={styles.relatedCardTitle}>{rs.title}</span>
                    {rs.price != null && <span className={styles.relatedCardPrice}>${rs.price}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {relatedLoading && (
          <div className={styles.relatedSection}>
            <h2 className={styles.relatedTitle}>Similar Services</h2>
            <div className={styles.relatedGrid}>
              {[1,2,3].map(i => (
                <div key={i} className={styles.relatedCard}>
                  <Skeleton height="120px" borderRadius="8px 8px 0 0" />
                  <div className={styles.relatedCardBody}>
                    <Skeleton width="40%" height="0.75rem" />
                    <Skeleton width="80%" height="0.9rem" />
                    <Skeleton width="30%" height="1rem" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <LinkedItemsSection entityType="SERVICE" entityId={service.id} currentUserId={session?.user?.id} />
      </div>
    </ErrorBoundary>
  )
}