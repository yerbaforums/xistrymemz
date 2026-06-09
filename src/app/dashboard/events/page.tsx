'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useToast } from '@/context/ToastContext'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import { serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import styles from './events.module.css'
import type { DashboardEvent } from '@/types/event'
import type { EventFormData } from '@/components/EventFormFields'
import Breadcrumbs from '@/components/Breadcrumbs'
import { EmptyState } from '@/components/EmptyState'

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  ORGANIZED: { icon: '🎯', label: 'Organized', color: '#00d9ff' },
  JOINED_PLAN: { icon: '📋', label: 'Plan Event', color: '#a855f7' },
  JOINED_GROUP: { icon: '👥', label: 'Group Event', color: '#22c55e' },
  PERSONAL: { icon: '🗓️', label: 'Personal', color: '#f59e0b' }
}

const CATEGORY_COLORS: Record<string, string> = {
  GROUP: '#a855f7',
  SCHOOL: '#f59e0b',
  SHOP: '#22c55e',
  PERSONAL: '#f97316'
}

type SortOption = 'newest' | 'oldest' | 'soonest' | 'mostAttendees'

export default function DashboardEvents() {
  const { success, error } = useToast()
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null)
  const [editingEvent, setEditingEvent] = useState<DashboardEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [editFormData, setEditFormData] = useState<EventFormData>(() => getDefaultEventFormData())

  useEffect(() => {
    if (editingEvent) {
      setEditFormData({
        title: editingEvent.title,
        description: editingEvent.description || '',
        imageUrl: '',
        images: [],
        eventCategory: editingEvent.eventCategory || 'GENERAL',
        eventDate: editingEvent.eventDate ? editingEvent.eventDate.slice(0, 16) : '',
        endDate: '',
        location: editingEvent.location || '',
        locationDetails: editingEvent.locationDetails || '',
        maxJoiners: editingEvent.maxJoiners,
        isTicketed: editingEvent.isTicketed,
        ticketPrice: editingEvent.ticketPrice || 0,
        currency: editingEvent.currency || 'USD',
        visibility: 'PUBLIC',
        eventType: 'public',
        needsVolunteers: false,
        volunteerRoles: '',
        volunteerDescription: '',
        acceptsDonations: editingEvent.acceptsDonations || false,
        selectedDonationAddrs: [],
        hashtags: editingEvent.hashtags || [],
        planId: editingEvent.planId || null,
        planTitle: editingEvent.planTitle || null,
        groupId: editingEvent.groupId || null,
        groupTitle: editingEvent.groupTitle || null,
        schoolId: null,
        shopId: null,
      })
    }
  }, [editingEvent])

  const handleDeleteEvent = async (id: string, eventType: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return
    try {
      const endpoint = eventType === 'PERSONAL' 
        ? `/api/events/personal/${id}`
        : `/api/events/${id}`
      const method = eventType === 'PERSONAL' ? 'DELETE' : 'DELETE'
      
      const res = await fetch(endpoint, { method })
      if (res.ok) {
        success('Event deleted')
        setSelectedEvent(null)
        fetchAll()
      } else {
        error('Failed to delete')
      }
    } catch (err) {
      error('Failed to delete')
    }
  }

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEvent) return
    setSaving(true)
    try {
      let volunteerRoles = editFormData.volunteerRoles
      if (editFormData.needsVolunteers && volunteerRoles) {
        try { JSON.parse(volunteerRoles) } catch {
          volunteerRoles = JSON.stringify(volunteerRoles.split(',').map(r => r.trim()).filter(Boolean))
        }
      }

      const legacy = donationAddressesToLegacy(editFormData.acceptsDonations ? editFormData.selectedDonationAddrs : [])
      const res = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          eventCategory: editFormData.eventCategory,
          eventDate: editFormData.eventDate || undefined,
          endDate: editFormData.endDate || undefined,
          location: editFormData.location,
          locationDetails: editFormData.locationDetails,
          maxJoiners: editFormData.maxJoiners,
          isTicketed: editFormData.isTicketed,
          ticketPrice: editFormData.ticketPrice,
          currency: editFormData.currency,
          acceptsDonations: editFormData.acceptsDonations,
          ...legacy,
          donationAddresses: editFormData.acceptsDonations ? serializeDonationAddresses(editFormData.selectedDonationAddrs) : null,
          needsVolunteers: editFormData.needsVolunteers,
          volunteerRoles,
          volunteerDescription: editFormData.volunteerDescription,
          hashtags: editFormData.hashtags,
          planId: editFormData.planId,
          groupId: editFormData.groupId,
        })
      })
      if (res.ok) {
        success('Event updated')
        setEditingEvent(null)
        setSelectedEvent(null)
        fetchAll()
      } else {
        error('Failed to update')
      }
    } catch (err) {
      error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const fetchAll = () => {
    fetch('/api/events/user')
      .then(res => res.json())
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const filteredEvents = useMemo(() => {
    let result = [...events]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'ALL') {
      result = result.filter(e => e.type === typeFilter)
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'soonest':
        result.sort((a, b) => {
          const aDate = a.eventDate ? new Date(a.eventDate).getTime() : Infinity
          const bDate = b.eventDate ? new Date(b.eventDate).getTime() : Infinity
          return aDate - bDate
        })
        break
      case 'mostAttendees':
        result.sort((a, b) => b.joinerCount - a.joinerCount)
        break
    }

    return result
  }, [events, searchQuery, typeFilter, sortBy])

  const typeCounts = {
    ALL: events.length,
    ORGANIZED: events.filter(e => e.type === 'ORGANIZED').length,
    JOINED_PLAN: events.filter(e => e.type === 'JOINED_PLAN').length,
    JOINED_GROUP: events.filter(e => e.type === 'JOINED_GROUP').length,
    PERSONAL: events.filter(e => e.type === 'PERSONAL').length
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatRelativeDate = (dateString: string) => {
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

  const getDateParts = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }, { label: 'Events' }]} />
        <div className={styles.loading}>Loading your events...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Dashboard', href: '/dashboard' }, { label: 'Events' }]} />
      <div className={styles.header}>
        <div>
          <h1>My Events</h1>
          <p className={styles.subtitle}>Manage and discover events</p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')} className={styles.viewToggle}>
            {viewMode === 'list' ? '📅 Calendar' : '📋 List'}
          </button>
          <Link href="/events/new" className="btn-primary">+ Create Event</Link>
          <Link href="/events" className="btn-secondary">Browse Events</Link>
        </div>
      </div>

      <div className={styles.searchBar}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          placeholder="Search events by title, description, or location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.filterPills}>
          {(['ALL', 'ORGANIZED', 'JOINED_PLAN', 'JOINED_GROUP', 'PERSONAL'] as const).map(f => {
            const config = TYPE_CONFIG[f]
            return (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={`${styles.filterBtn} ${typeFilter === f ? styles.active : ''}`}
              >
                {config ? config.icon : '🌟'} {f === 'ALL' ? 'All' : config?.label || f} ({typeCounts[f]})
              </button>
            )
          })}
        </div>
        <div className={styles.filterDropdowns}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)} className={styles.filterSelect}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="soonest">Soonest Event</option>
            <option value="mostAttendees">Most Attendees</option>
          </select>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState icon="📅" title="No events found" description="Browse public events or create your own." action={{ label: 'Browse Events', onClick: () => window.location.href = '/events' }} />
      ) : (
        <div className={styles.cardGrid}>
          {filteredEvents.map((event, index) => {
            const typeConfig = TYPE_CONFIG[event.type] || TYPE_CONFIG.PERSONAL
            const dateParts = getDateParts(event.eventDate)
            const categoryColor = event.eventCategory ? CATEGORY_COLORS[event.eventCategory] || '#6b7280' : '#6b7280'

            return (
              <div
                key={event.id}
                className={styles.card}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.badgeRow}>
                    <span className={styles.typeBadge} style={{ backgroundColor: typeConfig.color + '20', color: typeConfig.color, borderColor: typeConfig.color + '40' }}>
                      {typeConfig.icon} {typeConfig.label}
                    </span>
                    {event.eventCategory && event.eventCategory !== 'PERSONAL' && (
                      <span className={styles.categoryBadge} style={{ backgroundColor: categoryColor + '20', color: categoryColor }}>
                        {event.eventCategory}
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

                <Link href={`/events/${event.id}`} className={styles.cardTitle}>
                  {event.title}
                </Link>

                {event.description && (
                  <p className={styles.cardDesc}>{event.description}</p>
                )}

                <div className={styles.cardMeta}>
                  {event.location && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {event.location}
                    </span>
                  )}
                  {event.joinerCount > 0 && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      {event.joinerCount} {event.joinerCount === 1 ? 'attendee' : 'attendees'}
                    </span>
                  )}
                  {event.isTicketed && event.ticketPrice != null && event.ticketPrice > 0 && (
                    <span className={styles.metaItem}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 9a3 3 0 0 1 0 6v2a3 3 0 0 1 0 6h18a3 3 0 0 1 0-6v-2a3 3 0 0 1 0-6V9a3 3 0 0 1 0-6H2a3 3 0 0 1 0 6Z"/>
                        <path d="m13 5-2 2"/><path d="m13 17-2 2"/><path d="m11 11 2 2"/>
                      </svg>
                      ${event.ticketPrice}
                    </span>
                  )}
                </div>

                {event.planTitle && (
                  <Link href={`/plans/${event.planId || ''}`} className={styles.planLink}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    {event.planTitle}
                  </Link>
                )}

                <div className={styles.cardFooter}>
                  <span className={styles.cardDate}>{formatRelativeDate(event.createdAt)}</span>
                  <div className={styles.cardActions}>
                    {(event.type === 'ORGANIZED' || event.type === 'PERSONAL') && (
                      <>
                        <button 
                          onClick={() => { setSelectedEvent(event); setEditingEvent(event) }} 
                          className={styles.cardActionBtn}
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteEvent(event.id, event.type)} 
                          className={styles.cardDeleteBtn}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    <Link href={`/events/${event.id}`} className={styles.viewDetailsBtn}>
                      View
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className={styles.calendarContainer}>
          <div className={styles.calendarHeader}>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.calendarNav}>
              ←
            </button>
            <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.calendarNav}>
              →
            </button>
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
              const dayEvents = filteredEvents.filter(e => e.eventDate?.startsWith(dateStr))
              return (
                <div key={day} className={`${styles.calendarDay} ${dayEvents.length > 0 ? styles.hasEvents : ''}`}>
                  <span className={styles.dayNumber}>{day}</span>
                  {dayEvents.slice(0, 2).map(event => (
                    <div 
                      key={event.id} 
                      className={styles.eventDot} 
                      style={{ backgroundColor: TYPE_CONFIG[event.type]?.color || '#666' }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      {event.title.slice(0, 12)}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className={styles.moreEvents} onClick={() => setSelectedEvent(dayEvents[0])}>
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="modal-overlay" onClick={() => { setSelectedEvent(null); setEditingEvent(null) }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            {!editingEvent ? (
              <>
                <div className={styles.eventModalHeader}>
                  <h2>{selectedEvent.title}</h2>
                  <button onClick={() => setSelectedEvent(null)} className={styles.closeBtn}>✕</button>
                </div>
                <div className={styles.eventModalContent}>
                  <div className={styles.eventDetailRow}>
                    <span className={styles.eventLabel}>📅 Date</span>
                    <span>{selectedEvent.eventDate ? new Date(selectedEvent.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}</span>
                  </div>
                  <div className={styles.eventDetailRow}>
                    <span className={styles.eventLabel}>📍 Location</span>
                    <span>{selectedEvent.location || 'Not set'}</span>
                  </div>
                  <div className={styles.eventDetailRow}>
                    <span className={styles.eventLabel}>👥 Attendees</span>
                    <span>{selectedEvent.joinerCount} attending</span>
                  </div>
                  {selectedEvent.isTicketed && (
                    <div className={styles.eventDetailRow}>
                      <span className={styles.eventLabel}>🎫 Ticket</span>
                      <span>${selectedEvent.ticketPrice}</span>
                    </div>
                  )}
                  {selectedEvent.acceptsDonations && (
                    <div className={styles.eventDetailRow}>
                      <span className={styles.eventLabel}>💎 Donate</span>
                      <span style={{color: 'var(--accent-primary)'}}>{selectedEvent.donationCurrency || 'ETH'}</span>
                    </div>
                  )}
                  <div className={styles.eventDetailRow}>
                    <span className={styles.eventLabel}>🏷️ Type</span>
                    <span>{selectedEvent.type}</span>
                  </div>
                  {selectedEvent.description && (
                    <div className={styles.eventDetailRow}>
                      <span className={styles.eventLabel}>📝 Description</span>
                      <p>{selectedEvent.description.slice(0, 200)}{selectedEvent.description.length > 200 ? '...' : ''}</p>
                    </div>
                  )}
                </div>
                <div className={styles.eventModalActions}>
                  {(selectedEvent.type === 'ORGANIZED' || selectedEvent.type === 'PERSONAL') && (
                    <button onClick={() => setEditingEvent(selectedEvent)} className="btn-secondary">
                      ✏️ Edit Event
                    </button>
                  )}
                  <Link href={`/events/${selectedEvent.id}`} className="btn-primary">
                    View Full Details
                  </Link>
                  {(selectedEvent.type === 'ORGANIZED' || selectedEvent.type === 'PERSONAL') && (
                    <button onClick={() => handleDeleteEvent(selectedEvent.id, selectedEvent.type)} className={styles.deleteBtn}>
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={styles.eventModalHeader}>
                  <h2>✏️ Edit Event</h2>
                  <button onClick={() => { setEditingEvent(null); setSelectedEvent(null) }} className={styles.closeBtn}>✕</button>
                </div>
                <div>
                  <EventFormFields
                    formData={editFormData}
                    onChange={(patch) => setEditFormData(prev => ({ ...prev, ...patch }))}
                    onSubmit={handleUpdateEvent}
                    mode="edit"
                    saving={saving}
                    onCancel={() => { setEditingEvent(null); setSelectedEvent(null) }}
                    submitLabel="Save Changes"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}