'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '../page.module.css'

interface Event {
  id: string
  title: string
  description: string | null
  eventDate: string | null
  location: string | null
  isTicketed: boolean
  ticketPrice: number | null
  type: string
  createdAt: string
}

export default function DashboardEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/events/user')
      .then(res => res.json())
      .then(data => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>My Events</h1>
          <p className={styles.welcome}>Manage your events</p>
        </div>
        <Link href="/events" className="btn-secondary">Browse Events</Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : events.length === 0 ? (
        <div className={styles.empty}>
          <p>You haven&apos;t created any events yet.</p>
          <Link href="/events" className="btn-primary">Find Events</Link>
        </div>
      ) : (
        <div className={styles.list}>
          {events.map(event => (
            <Link key={event.id} href={`/events/${event.id}`} className={styles.item}>
              <div className={styles.itemMain}>
                <h3>{event.title}</h3>
                <p>{event.description || 'No description'}</p>
                <div className={styles.itemMeta}>
                  <span className={`badge badge-${event.type.toLowerCase()}`}>{event.type}</span>
                  {event.isTicketed && (
                    <span className="badge badge-ticketed">
                      🎟️ {event.ticketPrice ? `$${event.ticketPrice}` : 'Free'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.itemSide}>
                {event.eventDate && (
                  <span className={styles.date}>
                    {new Date(event.eventDate).toLocaleDateString()}
                  </span>
                )}
                <span className={styles.location}>
                  📍 {event.location || 'TBD'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
