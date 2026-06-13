'use client'

import { useState, ReactNode } from 'react'
import Link from 'next/link'
import styles from './SimpleCalendar.module.css'

interface EventData {
  id: string
  event: {
    id: string
    title: string
    eventDate: string | null
    projectId: string
  }
}

interface Props {
  events: EventData[]
}

export default function SimpleCalendar({ events }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredEvent, setHoveredEvent] = useState<{title: string, date: string, projectId: string} | null>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e: EventData) => {
      if (!e.event.eventDate) return false
      const eventDate = new Date(e.event.eventDate).toISOString().split('T')[0]
      return eventDate === dateStr
    })
  }

  const days: ReactNode[] = []
  for (let i = 0; i < startPadding; i++) {
    days.push(<div key={`empty-${i}`} className={styles.cellEmpty}></div>)
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dayEvents = getEventsForDay(day)
    days.push(
      <div key={day} className={`${styles.cell} ${dayEvents.length > 0 ? styles.hasEvents : ''}`}>
        <span className={styles.dayNumber}>{day}</span>
        <div className={styles.eventList}>
          {dayEvents.slice(0, 2).map((e: EventData) => (
            <Link 
              key={e.id} 
              href={`/projects/${e.event.projectId}?event=${e.event.id}`}
              className={styles.eventItem}
              onMouseEnter={() => setHoveredEvent({ title: e.event.title, date: e.event.eventDate || '', projectId: e.event.projectId })}
              onMouseLeave={() => setHoveredEvent(null)}
            >
              <span className={styles.eventDot}>📅</span>
              <span className={styles.eventTitle}>{e.event.title}</span>
            </Link>
          ))}
          {dayEvents.length > 2 && <span className={styles.more}>+{dayEvents.length - 2}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className={styles.navBtn}>←</button>
        <h3>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className={styles.navBtn}>→</button>
      </div>
      <div className={styles.grid}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {days}
      </div>
      {hoveredEvent && (
        <div className={styles.tooltip} onMouseEnter={() => {}} onMouseLeave={() => setHoveredEvent(null)}>
          <strong>{hoveredEvent.title}</strong>
          <p>📅 {hoveredEvent.date ? new Date(hoveredEvent.date).toLocaleDateString() : 'TBD'}</p>
          <Link href={`/projects/${hoveredEvent.projectId}`} className={styles.tooltipLink}>View Event →</Link>
        </div>
      )}
    </div>
  )
}