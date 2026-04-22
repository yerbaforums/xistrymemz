'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import styles from './events.module.css'

interface Event {
  id: string
  title: string
  description: string | null
  eventDate: string | null
  eventCategory: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number | null
  currency: string
  joinerCount: number
  type: string
  planTitle: string | null
  planId: string | null
  createdAt: string
}

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
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('newest')

  useEffect(() => {
    fetch('/api/events/user')
      .then(res => res.json())
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
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
        <div className={styles.loading}>Loading your events...</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Breadcrumbs items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'My Events' }
      ]} />
      
      <div className={styles.header}>
        <div>
          <h1>My Events</h1>
          <p className={styles.subtitle}>Manage and discover events</p>
        </div>
        <div className={styles.headerActions}>
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
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📅</div>
          <h3>No events found</h3>
          <p>You haven&apos;t created or joined any events yet. Browse public events to get started.</p>
          <Link href="/events" className="btn-primary">Browse Events</Link>
        </div>
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
                  <Link href={`/events/${event.id}`} className={styles.viewDetailsBtn}>
                    View Details
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}