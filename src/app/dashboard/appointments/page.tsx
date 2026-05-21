'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import styles from '../events/events.module.css'

interface AppointmentItem {
  id: string
  title: string
  description: string | null
  status: string
  declineReason?: string | null
  startTime: string
  endTime: string
  duration: number | null
  location: string | null
  meetingLink: string | null
  appointmentNotes?: string | null
  formResponses?: Record<string, string> | null
  product: { id: string; title: string; imageUrl: string | null } | null
  createdAt: string
  buyer: { id: string; name: string | null; image: string | null; username: string | null }
  seller: { id: string; name: string | null; image: string | null; username: string | null }
  _type: 'appointment'
  _role: 'buyer' | 'seller'
}

interface EventItem {
  id: string
  title: string
  description: string | null
  eventDate: string | null
  eventCategory: string | null
  location: string | null
  joinerCount: number
  type: string
  planTitle: string | null
  planId: string | null
  groupTitle: string | null
  groupId: string | null
  createdAt: string
  _type: 'event'
}

type PlannerItem = AppointmentItem | EventItem

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  PENDING: { icon: '⏳', label: 'Pending', color: '#f59e0b' },
  CONFIRMED: { icon: '✅', label: 'Confirmed', color: '#22c55e' },
  CANCELLED: { icon: '❌', label: 'Cancelled', color: '#ef4444' },
  COMPLETED: { icon: '✅', label: 'Completed', color: '#3b82f6' },
  REJECTED: { icon: '🚫', label: 'Declined', color: '#ef4444' },
}

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  ORGANIZED: { icon: '🎯', label: 'Organized', color: '#00d9ff' },
  JOINED: { icon: '📋', label: 'Joined', color: '#a855f7' },
  PERSONAL: { icon: '🗓️', label: 'Personal', color: '#f59e0b' },
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardAppointments() {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [appointments, setAppointments] = useState<AppointmentItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedItem, setSelectedItem] = useState<PlannerItem | null>(null)
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentItem | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleEnd, setRescheduleEnd] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineAppt, setDeclineAppt] = useState<AppointmentItem | null>(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [apptRes, evtRes] = await Promise.all([
        fetch('/api/appointments'),
        fetch('/api/events/user'),
      ])
      if (apptRes.ok) {
        const data = await apptRes.json()
        setAppointments((data.appointments || []).map((a: any) => ({
          ...a,
          _type: 'appointment' as const,
          _role: a.buyerId === session?.user?.id ? ('buyer' as const) : ('seller' as const)
        })))
      }
      if (evtRes.ok) {
        const data = await evtRes.json()
        setEvents((data || []).map((e: any) => ({ ...e, _type: 'event' })))
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAction = async (id: string, action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra })
    })
    if (res.ok) {
      const labels: Record<string, string> = {
        accept: 'Booking accepted!',
        decline: 'Booking declined',
        cancel: 'Appointment cancelled',
        complete: 'Marked as complete',
        reschedule: 'Rescheduled — awaiting confirmation'
      }
      success(labels[action] || 'Updated')
      fetchAll()
    } else {
      const err = await res.json()
      toastError(err.error || 'Failed')
    }
  }

  const openReschedule = (appt: AppointmentItem) => {
    setRescheduleAppt(appt)
    const start = new Date(appt.startTime)
    const end = new Date(appt.endTime)
    setRescheduleDate(start.toISOString().slice(0, 10))
    setRescheduleStart(start.toTimeString().slice(0, 5))
    setRescheduleEnd(end.toTimeString().slice(0, 5))
    setShowRescheduleModal(true)
  }

  const handleRescheduleSubmit = async () => {
    if (!rescheduleAppt) return
    const startTime = new Date(`${rescheduleDate}T${rescheduleStart}`)
    const endTime = new Date(`${rescheduleDate}T${rescheduleEnd}`)
    if (endTime <= startTime) {
      toastError('End time must be after start time')
      return
    }
    await handleAction(rescheduleAppt.id, 'reschedule', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    })
    setShowRescheduleModal(false)
    setRescheduleAppt(null)
  }

  const openDecline = (appt: AppointmentItem) => {
    setDeclineAppt(appt)
    setDeclineReason('')
    setShowDeclineModal(true)
  }

  const handleDeclineSubmit = async () => {
    if (!declineAppt) return
    await handleAction(declineAppt.id, 'decline', { declineReason })
    setShowDeclineModal(false)
    setDeclineAppt(null)
  }

  const allItems: PlannerItem[] = useMemo(() => {
    let items: PlannerItem[] = [...appointments, ...events]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q)
      )
    }
    if (filterType !== 'ALL') {
      items = items.filter(i => {
        if (i._type === 'appointment') return filterType === 'APPOINTMENT'
        return i.type === filterType
      })
    }
    return items
  }, [appointments, events, searchQuery, filterType])

  const upcomingItems = useMemo(() => {
    const now = new Date()
    return allItems
      .filter(i => {
        const d = i._type === 'appointment' ? i.startTime : (i as EventItem).eventDate
        return d ? new Date(d) >= now : true
      })
      .sort((a, b) => {
        const aD = a._type === 'appointment' ? a.startTime : ((a as EventItem).eventDate || a.createdAt)
        const bD = b._type === 'appointment' ? b.startTime : ((b as EventItem).eventDate || b.createdAt)
        return new Date(aD).getTime() - new Date(bD).getTime()
      })
  }, [allItems])

  const getDateParts = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return { day: d.getDate(), month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() }
  }

  if (loading) {
    return <div className={styles.page}><div className={styles.loading}>Loading your planner...</div></div>
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Planner</h1>
          <p className={styles.subtitle}>Appointments, personal events, and group activities</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/profile/edit" className={styles.viewToggle} style={{ textDecoration: 'none' }}>
            ⏰ Availability
          </Link>
          <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className={styles.viewToggle}>
            {viewMode === 'list' ? '📅 Calendar' : '📋 List'}
          </button>
          <Link href="/events/new" className="btn-primary">+ New Event</Link>
        </div>
      </div>

      <div className={styles.searchBar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Search planner..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.searchInput} />
      </div>

      <div className={styles.controls}>
        <div className={styles.filterPills}>
          {[
            { key: 'ALL', icon: '🌟', label: 'All' },
            { key: 'APPOINTMENT', icon: '📅', label: 'Appointments' },
            { key: 'ORGANIZED', icon: '🎯', label: 'Organized' },
            { key: 'JOINED', icon: '📋', label: 'Joined' },
            { key: 'PERSONAL', icon: '🗓️', label: 'Personal' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterType(f.key)}
              className={`${styles.filterBtn} ${filterType === f.key ? styles.active : ''}`}>
              {f.icon} {f.label} ({f.key === 'ALL' ? allItems.length :
                f.key === 'APPOINTMENT' ? appointments.length :
                events.filter(e => e.type === f.key).length})
            </button>
          ))}
        </div>
      </div>

      {upcomingItems.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <h3>Nothing planned yet</h3>
          <p>Book appointments, create events, or join group activities to fill your planner.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/profile/edit" className="btn-secondary">⏰ Set Availability</Link>
            <Link href="/events/new" className="btn-primary">+ New Event</Link>
            <Link href="/events" className="btn-secondary">Browse Events</Link>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'list' && (
            <div className={styles.cardGrid}>
              {upcomingItems.map((item, i) => {
                if (item._type === 'appointment') {
                  const appt = item as AppointmentItem
                  const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.PENDING
                  const roleLabel = appt._role === 'buyer' ? 'with ' + (appt.seller.name || 'Seller') : 'from ' + (appt.buyer.name || 'Buyer')
                  const dateParts = getDateParts(appt.startTime)

                  return (
                    <div key={appt.id} className={styles.card} style={{ animationDelay: `${i * 50}ms` }}>
                      <div className={styles.cardHeader}>
                        <div className={styles.badgeRow}>
                          <span className={styles.typeBadge} style={{ backgroundColor: statusCfg.color + '20', color: statusCfg.color, borderColor: statusCfg.color + '40' }}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                          <span className={styles.typeBadge} style={{ backgroundColor: '#6366f120', color: '#6366f1', borderColor: '#6366f140' }}>
                            📅 Appointment
                          </span>
                        </div>
                        {dateParts && (
                          <div className={styles.dateBlock}>
                            <span className={styles.dateDay}>{dateParts.day}</span>
                            <span className={styles.dateMonth}>{dateParts.month}</span>
                          </div>
                        )}
                      </div>
                      <div className={styles.cardTitle}>{appt.title}</div>
                      {appt.description && <p className={styles.cardDesc}>{appt.description}</p>}
                      <div className={styles.cardMeta}>
                        <span className={styles.metaItem}>🕐 {formatTime(appt.startTime)} – {formatTime(appt.endTime)}</span>
                        {appt.location && <span className={styles.metaItem}>📍 {appt.location}</span>}
                        {appt.meetingLink && <span className={styles.metaItem}>🔗 <a href={appt.meetingLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>Meeting link</a></span>}
                        <span className={styles.metaItem}>👤 {roleLabel}</span>
                        {appt.product && <span className={styles.metaItem}>🛒 <Link href={`/products/${appt.product.id}`} onClick={e => e.stopPropagation()}>{appt.product.title}</Link></span>}
                      {appt.status === 'REJECTED' && appt.declineReason && <span className={styles.metaItem} style={{ color: '#ef4444' }}>🚫 {appt.declineReason}</span>}
                      </div>
                      <div className={styles.cardFooter}>
                        <span className={styles.cardDate}>{formatRelativeDate(appt.createdAt)}</span>
                        <div className={styles.cardActions}>
                          <button onClick={() => setSelectedItem(appt)} className={styles.cardActionBtn}>👁️ View</button>
                          {appt._role === 'seller' && appt.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleAction(appt.id, 'accept')} className={styles.cardActionBtn} style={{ color: '#22c55e', borderColor: '#22c55e' }}>✅ Accept</button>
                              <button onClick={() => openDecline(appt)} className={styles.cardDeleteBtn}>🚫 Decline</button>
                            </>
                          )}
                          {appt._role === 'buyer' && appt.status === 'PENDING' && (
                            <button onClick={() => handleAction(appt.id, 'cancel')} className={styles.cardDeleteBtn}>❌ Cancel Request</button>
                          )}
                          {appt.status === 'CONFIRMED' && (
                            <>
                              <button onClick={() => openReschedule(appt)} className={styles.cardActionBtn}>🔄 Reschedule</button>
                              <button onClick={() => handleAction(appt.id, 'cancel')} className={styles.cardDeleteBtn}>❌ Cancel</button>
                            </>
                          )}
                          {appt.status === 'CONFIRMED' && appt._role === 'seller' && (
                            <button onClick={() => handleAction(appt.id, 'complete')} className={styles.cardActionBtn} style={{ color: '#3b82f6', borderColor: '#3b82f6' }}>✅ Complete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                } else {
                  const evt = item as EventItem
                  const typeCfg = TYPE_CONFIG[evt.type] || TYPE_CONFIG.PERSONAL
                  const dateParts = getDateParts(evt.eventDate)
                  return (
                    <Link key={evt.id} href={`/events/${evt.id}`} className={styles.cardLink}>
                      <div className={styles.card} style={{ animationDelay: `${i * 50}ms` }}>
                        <div className={styles.cardHeader}>
                          <div className={styles.badgeRow}>
                            <span className={styles.typeBadge} style={{ backgroundColor: typeCfg.color + '20', color: typeCfg.color, borderColor: typeCfg.color + '40' }}>
                              {typeCfg.icon} {typeCfg.label}
                            </span>
                            {evt.eventCategory && evt.eventCategory !== 'PERSONAL' && (
                              <span className={styles.categoryBadge} style={{ backgroundColor: '#6b728020', color: '#6b7280' }}>
                                {evt.eventCategory}
                              </span>
                            )}
                          </div>
                          {dateParts && (
                            <div className={styles.dateBlock}>
                              <span className={styles.dateDay}>{dateParts.day}</span>
                              <span className={styles.dateMonth}>{dateParts.month}</span>
                            </div>
                          )}
                        </div>
                        <div className={styles.cardTitle}>{evt.title}</div>
                        {evt.description && <p className={styles.cardDesc}>{evt.description}</p>}
                        <div className={styles.cardMeta}>
                          {evt.eventDate && <span className={styles.metaItem}>📅 {formatDate(evt.eventDate)}</span>}
                          {evt.location && <span className={styles.metaItem}>📍 {evt.location}</span>}
                          {evt.joinerCount > 0 && <span className={styles.metaItem}>👥 {evt.joinerCount} attending</span>}
                          {evt.planTitle && <span className={styles.metaItem}>🚀 {evt.planTitle}</span>}
                          {evt.groupTitle && <span className={styles.metaItem}>👥 {evt.groupTitle}</span>}
                        </div>
                        <div className={styles.cardFooter}>
                          <span className={styles.cardDate}>{formatRelativeDate(evt.createdAt)}</span>
                          <div className={styles.cardActions}>
                            <span className={styles.viewDetailsBtn}>View →</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                }
              })}
            </div>
          )}

          {viewMode === 'calendar' && (
            <div className={styles.calendarContainer}>
              <div className={styles.calendarHeader}>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNav}>←</button>
                <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNav}>→</button>
              </div>
              <div className={styles.calendarGrid}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className={styles.calendarDayHeader}>{day}</div>
                ))}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className={styles.calendarEmpty} />
                ))}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1
                  const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const dayItems = allItems.filter(i => {
                    const d = i._type === 'appointment' ? i.startTime : (i as EventItem).eventDate
                    return d?.startsWith(dateStr)
                  })
                  return (
                    <div key={day} className={`${styles.calendarDay} ${dayItems.length > 0 ? styles.hasEvents : ''}`}>
                      <span className={styles.dayNumber}>{day}</span>
                      {dayItems.slice(0, 2).map(item => (
                        <div key={item.id} className={styles.eventDot}
                          style={{ backgroundColor: item._type === 'appointment' ? '#6366f1' : (TYPE_CONFIG[(item as EventItem).type]?.color || '#666') }}
                          onClick={() => setSelectedItem(item)}>
                          {item.title.slice(0, 10)}
                        </div>
                      ))}
                      {dayItems.length > 2 && <div className={styles.moreEvents} onClick={() => setSelectedItem(dayItems[0])}>+{dayItems.length - 2} more</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            {selectedItem._type === 'appointment' ? (
              (() => {
                const a = selectedItem as AppointmentItem
                const sc = STATUS_CONFIG[a.status] || STATUS_CONFIG.PENDING
                return (
                  <>
                    <div className={styles.eventModalHeader}>
                      <h2>{a.title}</h2>
                      <button onClick={() => setSelectedItem(null)} className={styles.closeBtn}>✕</button>
                    </div>
                    <div className={styles.eventModalContent}>
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Status</span><span style={{ color: sc.color }}>{sc.icon} {sc.label}</span></div>
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Start</span><span>{formatDate(a.startTime)} at {formatTime(a.startTime)}</span></div>
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>End</span><span>{formatDate(a.endTime)} at {formatTime(a.endTime)}</span></div>
                      {a.location && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Location</span><span>{a.location}</span></div>}
                      {a.meetingLink && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Meeting</span><a href={a.meetingLink} target="_blank" rel="noopener noreferrer">{a.meetingLink}</a></div>}
                      {a.product && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Product</span><Link href={`/products/${a.product.id}`}>{a.product.title}</Link></div>}
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Buyer</span><span>{a.buyer.name || 'Anonymous'}</span></div>
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Seller</span><span>{a.seller.name || 'Anonymous'}</span></div>
                      {a.description && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Notes</span><p>{a.description}</p></div>}
                      {a.formResponses && Object.keys(a.formResponses).length > 0 && (
                        <div className={styles.eventDetailRow}>
                          <span className={styles.eventLabel}>Form Responses</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {Object.entries(a.formResponses).map(([label, value]) => (
                              <div key={label}><strong>{label}:</strong> {value}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.eventModalActions}>
                      {a._role === 'seller' && a.status === 'PENDING' && (
                        <>
                          <button onClick={() => { handleAction(a.id, 'accept'); setSelectedItem(null) }} className="btn-primary">✅ Accept</button>
                          <button onClick={() => { openDecline(a); setSelectedItem(null) }} className={styles.deleteBtn}>🚫 Decline</button>
                        </>
                      )}
                      {a._role === 'buyer' && a.status === 'PENDING' && (
                        <button onClick={() => { handleAction(a.id, 'cancel'); setSelectedItem(null) }} className={styles.deleteBtn}>❌ Cancel Request</button>
                      )}
                      {a.status === 'CONFIRMED' && (
                        <>
                          <button onClick={() => { openReschedule(a); setSelectedItem(null) }} className="btn-secondary">🔄 Reschedule</button>
                          <button onClick={() => { handleAction(a.id, 'cancel'); setSelectedItem(null) }} className={styles.deleteBtn}>❌ Cancel</button>
                        </>
                      )}
                      {a._role === 'seller' && a.status === 'CONFIRMED' && (
                        <button onClick={() => { handleAction(a.id, 'complete'); setSelectedItem(null) }} className="btn-primary">✅ Mark Complete</button>
                      )}
                      {a.status === 'REJECTED' && a.declineReason && (
                        <div style={{ marginTop: 8, padding: 12, background: '#fef2f2', borderRadius: 8, color: '#991b1b', fontSize: 14 }}>
                          <strong>Reason for declining:</strong> {a.declineReason}
                        </div>
                      )}
                    </div>
                  </>
                )
              })()
            ) : (
              (() => {
                const e = selectedItem as EventItem
                const tc = TYPE_CONFIG[e.type] || TYPE_CONFIG.PERSONAL
                return (
                  <>
                    <div className={styles.eventModalHeader}>
                      <h2>{e.title}</h2>
                      <button onClick={() => setSelectedItem(null)} className={styles.closeBtn}>✕</button>
                    </div>
                    <div className={styles.eventModalContent}>
                      <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Type</span><span style={{ color: tc.color }}>{tc.icon} {tc.label}</span></div>
                      {e.eventDate && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Date</span><span>{formatDate(e.eventDate)}</span></div>}
                      {e.location && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Location</span><span>{e.location}</span></div>}
                      {e.joinerCount > 0 && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Attendees</span><span>{e.joinerCount} attending</span></div>}
                      {e.planTitle && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Project</span><Link href={`/plans/${e.planId}`}>{e.planTitle}</Link></div>}
                      {e.groupTitle && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Group</span><Link href={`/groups/${e.groupId}`}>{e.groupTitle}</Link></div>}
                      {e.description && <div className={styles.eventDetailRow}><span className={styles.eventLabel}>Description</span><p>{e.description.slice(0, 200)}</p></div>}
                    </div>
                    <div className={styles.eventModalActions}>
                      <Link href={`/events/${e.id}`} className="btn-primary">View Details</Link>
                    </div>
                  </>
                )
              })()
            )}
          </div>
        </div>
      )}

      {showRescheduleModal && rescheduleAppt && (
        <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className={styles.eventModalHeader}>
              <h2>Reschedule: {rescheduleAppt.title}</h2>
              <button onClick={() => setShowRescheduleModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 }}>
                Date
                <input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 }}>
                Start Time
                <input type="time" value={rescheduleStart} onChange={e => setRescheduleStart(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 }}>
                End Time
                <input type="time" value={rescheduleEnd} onChange={e => setRescheduleEnd(e.target.value)} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }} />
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowRescheduleModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleRescheduleSubmit} className="btn-primary">Submit Reschedule</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeclineModal && declineAppt && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className={styles.eventModalHeader}>
              <h2>Decline: {declineAppt.title}</h2>
              <button onClick={() => setShowDeclineModal(false)} className={styles.closeBtn}>✕</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, fontWeight: 500 }}>
                Reason (optional, shared with buyer)
                <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)} rows={3} style={{ padding: 8, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, resize: 'vertical' }} placeholder="e.g. No longer offering this service..." />
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowDeclineModal(false)} className="btn-secondary">Keep Appointment</button>
                <button onClick={handleDeclineSubmit} className={styles.deleteBtn}>🚫 Decline Booking</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
