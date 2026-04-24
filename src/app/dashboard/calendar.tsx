'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './calendar.module.css'
import { useToast } from '@/context/ToastContext'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  allDay: boolean
  location?: string
  color: string
  userId: string
  userName?: string
  visibility: string
}

interface PlanEventJoiner {
  id: string
  event: {
    id: string
    title: string
    eventDate: Date | null
    planId: string
    color: string
  }
}

export default function CalendarWidget() {
  const { warning } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    allDay: false,
    location: '',
    color: '#3b82f6',
    visibility: 'PRIVATE'
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const [calRes, planRes] = await Promise.all([
        fetch('/api/calendar/events'),
        fetch('/api/plans/events/joined')
      ])
      
      if (!calRes.ok) throw new Error('Failed to fetch calendar events')
      const data = await calRes.json()
      setEvents([...(data.myEvents || []), ...(data.publicEvents || []), ...(data.connectionEvents || [])])
      
      if (!planRes.ok) throw new Error('Failed to fetch plan events')
      const planData = await planRes.json()
      const planEvents: CalendarEvent[] = (planData || []).map((joiner: PlanEventJoiner) => ({
        id: joiner.event.id,
        title: joiner.event.title,
        startDate: joiner.event.eventDate?.toString() || '',
        color: '#10b981',
        userId: '',
        visibility: 'PUBLIC'
      }))
      setEvents(prev => [...prev, ...planEvents])
    } catch (err) {
      console.error(err)
    }
  }

  const createEvent = async () => {
    if (!newEvent.title || !newEvent.startDate) {
      warning('Please fill in required fields')
      return
    }
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      })
      if (res.ok) {
        setShowAddEvent(false)
        setNewEvent({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          allDay: false,
          location: '',
          color: '#3b82f6',
          visibility: 'PRIVATE'
        })
        fetchEvents()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate)

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => {
      const eventDate = e.startDate.split('T')[0]
      return eventDate === dateStr
    })
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

  return (
    <div className={styles.calendarWidget}>
      <div className={styles.calendarHeader}>
        <h3>📅 My Calendar</h3>
        <button onClick={() => setShowAddEvent(true)} className={styles.addEventBtn}>
          + Add Event
        </button>
      </div>

      <div className={styles.calendarNav}>
        <button onClick={prevMonth} className={styles.navBtn}>←</button>
        <span className={styles.monthYear}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <button onClick={nextMonth} className={styles.navBtn}>→</button>
      </div>

      <div className={styles.calendarGrid}>
        <div className={styles.dayNames}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className={styles.dayName}>{d}</div>
          ))}
        </div>
        <div className={styles.days}>
          {Array.from({ length: startingDay }).map((_, i) => (
            <div key={`empty-${i}`} className={styles.dayCellEmpty}></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEvents = getEventsForDay(day)
            return (
              <div key={day} className={styles.dayCell}>
                <span className={styles.dayNumber}>{day}</span>
                <div className={styles.dayEvents}>
                  {dayEvents.slice(0, 2).map(e => (
                    <div 
                      key={e.id} 
                      className={styles.eventDot} 
                      style={{ backgroundColor: e.color }}
                      title=""
                      onMouseEnter={() => {
                        if (tooltipTimeout) clearTimeout(tooltipTimeout)
                        setHoveredEvent(e)
                      }}
                      onMouseLeave={() => {
                        const timeout = setTimeout(() => setHoveredEvent(null), 300)
                        setTooltipTimeout(timeout)
                      }}
                    />
                  ))}
                  {dayEvents.length > 2 && <span className={styles.moreEvents}>+{dayEvents.length - 2}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {hoveredEvent && (
        <div 
          className={styles.eventTooltip}
          onMouseEnter={() => {
            if (tooltipTimeout) clearTimeout(tooltipTimeout)
            setHoveredEvent(hoveredEvent)
          }}
          onMouseLeave={() => {
            const timeout = setTimeout(() => setHoveredEvent(null), 300)
            setTooltipTimeout(timeout)
          }}
        >
          <strong>{hoveredEvent.title}</strong>
          <p>📅 {new Date(hoveredEvent.startDate).toLocaleDateString()}</p>
          {hoveredEvent.location && <p>📍 {hoveredEvent.location}</p>}
          {hoveredEvent.description && <p className={styles.tooltipDesc}>{hoveredEvent.description.slice(0, 60)}{hoveredEvent.description.length > 60 ? '...' : ''}</p>}
          <Link href={`/plans?event=${hoveredEvent.id}`} className={styles.tooltipLink}>Click to view details →</Link>
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendItem}>🟦 My Events</span>
        <span className={styles.legendItem}>🟢 Public</span>
        <span className={styles.legendItem}>🟠 Connections</span>
      </div>

      {showAddEvent && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Create New Event</h3>
            <select
              value={newEvent.visibility}
              onChange={e => setNewEvent({ ...newEvent, visibility: e.target.value })}
              className={styles.select}
            >
              <option value="PRIVATE">🔒 Private - Only you</option>
              <option value="CONNECTIONS">🤝 Connections - Your connections</option>
              <option value="PUBLIC">🌍 Public - Everyone</option>
              <option value="PROJECT">📋 Project - Project members</option>
              <option value="GROUP">👥 Group - Group members</option>
              <option value="SCHOOL">🏫 School - School community</option>
              <option value="SHOP">🏪 Shop - Shop customers</option>
            </select>
            <input
              type="text"
              placeholder="Event Title *"
              value={newEvent.title}
              onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
              className={styles.input}
            />
            <textarea
              placeholder="Description"
              value={newEvent.description}
              onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
              className={styles.textarea}
              rows={2}
            />
            <div className={styles.inputRow}>
              <input
                type="datetime-local"
                value={newEvent.startDate}
                onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                className={styles.input}
              />
              <input
                type="datetime-local"
                value={newEvent.endDate}
                onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                className={styles.input}
              />
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={newEvent.allDay}
                onChange={e => setNewEvent({ ...newEvent, allDay: e.target.checked })}
              />
              All Day Event
            </label>
            <select
              value={newEvent.visibility}
              onChange={e => setNewEvent({ ...newEvent, visibility: e.target.value })}
              className={styles.select}
            >
              <option value="PRIVATE">🔒 Private</option>
              <option value="PUBLIC">🌍 Public</option>
              <option value="CONNECTIONS">🤝 Connections Only</option>
            </select>
            <input
              type="text"
              placeholder="Location"
              value={newEvent.location}
              onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
              className={styles.input}
            />
            <div className={styles.colorPicker}>
              <span>Event Color:</span>
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                <button
                  key={c}
                  className={`${styles.colorBtn} ${newEvent.color === c ? styles.selected : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewEvent({ ...newEvent, color: c })}
                />
              ))}
            </div>
            <div className={styles.modalActions}>
              <button onClick={createEvent} className={styles.createBtn}>Create Event</button>
              <button onClick={() => setShowAddEvent(false)} className={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}