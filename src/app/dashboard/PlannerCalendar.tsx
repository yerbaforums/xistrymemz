'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './PlannerCalendar.module.css'
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
  // Unified planner kind + deep link. Events without a link keep the
  // hover tooltip; appointments link to their detail modal.
  kind?: 'personal' | 'project' | 'trip' | 'connections' | 'appointment' | 'event' | 'request' | 'rental'
  status?: string
  link?: string
}

interface EventJoinerResponse {
  id: string
  event: {
    id: string
    title: string
    eventDate: Date | null
    projectId: string | null
    groupId: string | null
    color: string
  }
}

interface CalendarTrip {
  id: string
  title: string
  startDate?: string
  endDate?: string
  userId?: string
  isPublic?: boolean
}

// Hour-grid for week + day views. Timed blocks position from start/end
// minutes; multi-day items and trips render in the all-day header.
// Appointment blocks link to their detail modal (highlight flow) so
// confirmations happen without leaving the planner.
function WeekDayView({ days, allDayFor, timedFor, timedRange, localDayKey, hours, hourH, fmtHour, goToDay, single }: {
  days: Date[]
  allDayFor: (dateStr: string) => CalendarEvent[]
  timedFor: (dateStr: string) => CalendarEvent[]
  timedRange: (e: CalendarEvent) => { startMin: number; endMin: number } | null
  localDayKey: (d: Date) => string
  hours: number[]
  hourH: number
  fmtHour: (h: number) => string
  goToDay: (d: Date) => void
  single: boolean
}) {
  const todayKey = localDayKey(new Date())
  return (
    <div className={styles.weekWrap}>
      <div className={styles.weekHeadRow}>
        <div className={styles.weekGutter} />
        {days.map(d => {
          const key = localDayKey(d)
          return (
            <button
              key={key}
              type="button"
              className={`${styles.weekHeadCell} ${key === todayKey ? styles.weekToday : ''}`}
              onClick={() => goToDay(d)}
              title={single ? undefined : 'Open day view'}
            >
              <span className={styles.weekDow}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className={styles.weekNum}>{d.getDate()}</span>
            </button>
          )
        })}
      </div>
      <div className={styles.weekAllDayRow}>
        <div className={styles.weekGutter} />
        {days.map(d => {
          const key = localDayKey(d)
          const items = allDayFor(key)
          return (
            <div key={key} className={styles.weekAllDayCell}>
              {items.slice(0, 3).map(e => (
                e.link ? (
                  <Link key={e.id} href={e.link} className={styles.weekAllDayPill} style={{ borderColor: e.color }} title={e.title}>
                    {e.title.slice(0, 24)}
                  </Link>
                ) : (
                  <span key={e.id} className={styles.weekAllDayPill} style={{ borderColor: e.color }} title={e.title}>
                    {e.title.slice(0, 24)}
                  </span>
                )
              ))}
              {items.length > 3 && <span className={styles.moreEvents}>+{items.length - 3}</span>}
            </div>
          )
        })}
      </div>
      <div className={styles.weekGrid} style={{ height: hours.length * hourH }}>
        <div className={styles.weekGutterCol}>
          {hours.map(h => (
            <div key={h} className={styles.weekHourLabel} style={{ height: hourH }}>{fmtHour(h)}</div>
          ))}
        </div>
        {days.map(d => {
          const key = localDayKey(d)
          const items = timedFor(key)
          return (
            <div key={key} className={`${styles.weekDayCol} ${key === todayKey ? styles.weekTodayCol : ''}`}>
              {hours.map(h => (
                <div key={h} className={styles.weekHourCell} style={{ height: hourH }} />
              ))}
              {items.map(e => {
                const r = timedRange(e)
                if (!r) return null
                const top = (r.startMin / 60) * hourH
                const height = Math.max(((r.endMin - r.startMin) / 60) * hourH, 20)
                const inner = (
                  <>
                    <span className={styles.weekBlockTime}>
                      {new Date(e.startDate).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      {e.status ? ` · ${e.status}` : ''}
                    </span>
                    <span className={styles.weekBlockTitle}>{e.title}</span>
                  </>
                )
                return e.link ? (
                  <Link
                    key={e.id}
                    href={e.link}
                    className={styles.weekBlock}
                    style={{ top, height, backgroundColor: e.color }}
                    title={`${e.title}${e.status ? ` (${e.status})` : ''}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={e.id}
                    className={styles.weekBlock}
                    style={{ top, height, backgroundColor: e.color }}
                    title={e.title}
                  >
                    {inner}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarWidget() {
  const { warning } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null)
  const [tooltipTimeout, setTooltipTimeout] = useState<NodeJS.Timeout | null>(null)
  const [filters, setFilters] = useState({
    personal: true,
    trips: true,
    planEvents: true,
    connections: false,
    appointments: true,
    events: true,
    requests: true,
    rentals: true,
  })
  const [trips, setTrips] = useState<CalendarTrip[]>([])
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
      const [calRes, planRes, tripsRes, apptsRes] = await Promise.all([
        fetch('/api/calendar/events'),
        fetch('/api/projects/events/joined'),
        fetch('/api/trips'),
        fetch('/api/appointments'),
      ])

      // Each source degrades independently: a failed fetch logs and yields
      // nothing rather than aborting the whole planner.
      let data: {
        myEvents: CalendarEvent[]
        publicEvents: CalendarEvent[]
        connectionEvents: CalendarEvent[]
        joinedEvents?: unknown[]
        requestDeadlines?: unknown[]
        rentalWindows?: unknown[]
      } =
        { myEvents: [], publicEvents: [], connectionEvents: [] }
      if (calRes.ok) {
        try {
          const parsed = await calRes.json()
          data = {
            myEvents: parsed?.myEvents || [],
            publicEvents: parsed?.publicEvents || [],
            connectionEvents: parsed?.connectionEvents || [],
            joinedEvents: parsed?.joinedEvents || [],
            requestDeadlines: parsed?.requestDeadlines || [],
            rentalWindows: parsed?.rentalWindows || [],
          }
        } catch { /* keep defaults */ }
      } else {
        console.error('Failed to fetch calendar events')
      }
      const tagKind = (list: CalendarEvent[], kind: NonNullable<CalendarEvent['kind']>) =>
        (list || []).map(e => ({ ...e, kind }))
      setEvents([
        ...tagKind(data.myEvents, 'personal'),
        ...tagKind(data.publicEvents, 'project'),
        ...tagKind(data.connectionEvents, 'connections'),
        ...((data.joinedEvents || []) as Array<{ id: string; title: string; description?: string | null; eventDate?: string | null; endDate?: string | null; location?: string | null }>).map(e => ({
          id: `evt-${e.id}`,
          title: `🎟️ ${e.title}`,
          description: e.description || undefined,
          startDate: e.eventDate || '',
          endDate: e.endDate || undefined,
          allDay: !e.eventDate || !e.eventDate.includes('T'),
          location: e.location || undefined,
          color: '#8b5cf6',
          userId: '',
          visibility: 'PUBLIC',
          kind: 'event' as const,
          link: `/events/${e.id}`,
        })),
        ...((data.requestDeadlines || []) as Array<{ id: string; title: string; deadline?: string | null }>).map(r => ({
          id: `req-${r.id}`,
          title: `⏰ ${r.title}`,
          startDate: r.deadline || '',
          allDay: !r.deadline || !r.deadline.includes('T'),
          color: '#f43f5e',
          userId: '',
          visibility: 'PRIVATE',
          kind: 'request' as const,
          link: `/requests/${r.id}`,
        })),
        ...((data.rentalWindows || []) as Array<{ id: string; description?: string | null; rentalStart?: string | null; rentalEnd?: string | null; status: string; buyerId: string }>).map(o => ({
          id: `rent-${o.id}`,
          title: `🔑 Rental: ${(o.description || 'order').slice(0, 40)}`,
          startDate: o.rentalStart || '',
          endDate: o.rentalEnd || undefined,
          allDay: true,
          color: '#06b6d4',
          userId: '',
          visibility: 'PRIVATE',
          kind: 'rental' as const,
          status: o.status,
          link: `/orders/${o.id}`,
        })),
      ])
      
      let planList: EventJoinerResponse[] = []
      if (planRes.ok) {
        try {
          const planData = await planRes.json()
          // apiSuccess wraps: { success, data: [...] }. Tolerate a bare array.
          planList = Array.isArray(planData)
            ? planData
            : (planData?.data || planData?.events || planData?.items || [])
        } catch {
          console.error('Failed to parse project events')
        }
      } else {
        console.error('Failed to fetch project events')
      }
      const planEvents: CalendarEvent[] = planList.map((joiner: EventJoinerResponse) => ({
        id: joiner.event.id,
        title: joiner.event.title,
        startDate: joiner.event.eventDate?.toString() || '',
        color: '#10b981',
        userId: '',
        visibility: 'PUBLIC',
        kind: 'project',
        allDay: !joiner.event.eventDate || !joiner.event.eventDate.toString().includes('T'),
      }))
      setEvents(prev => [...prev, ...planEvents])

      if (tripsRes.ok) {
        const tripsData = await tripsRes.json()
        setTrips([...(tripsData.owned || []), ...(tripsData.shared || [])])
      }

      // Appointments (buyer + seller) join the unified planner. Color follows
      // booking status so confirmations stand out at a glance.
      if (apptsRes.ok) {
        const apptsData = await apptsRes.json()
        const appts = apptsData?.data?.appointments || apptsData?.appointments || []
        const statusColor = (s: string) =>
          s === 'CONFIRMED' ? '#6366f1' : s === 'PAID' ? '#22c55e' : s === 'PENDING' ? '#f59e0b' : '#9ca3af'
        const apptEvents: CalendarEvent[] = appts
          .filter((a: { startTime?: string }) => a && a.startTime)
          .map((a: { id: string; title: string; description?: string; startTime: string; endTime?: string; location?: string; status: string }) => ({
            id: `appt-${a.id}`,
            title: `📅 ${a.title}`,
            description: a.description || undefined,
            startDate: a.startTime,
            endDate: a.endTime,
            allDay: false,
            location: a.location || undefined,
            color: statusColor(a.status),
            userId: '',
            visibility: 'PRIVATE',
            kind: 'appointment' as const,
            status: a.status,
            link: `/dashboard/appointments?highlight=${a.id}`,
          }))
        setEvents(prev => [...prev, ...apptEvents])
      }
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

  // Day-bucket filter shared by month, week and day views. Filters run on
  // the unified `kind`, preserving the old visibility-based behavior:
  // personal=myEvents, project=public+joined, connections as before.
  const visibleKind = (kind: NonNullable<CalendarEvent['kind']>): boolean => {
    if (kind === 'personal') return filters.personal
    if (kind === 'project') return filters.planEvents
    if (kind === 'connections') return filters.connections
    if (kind === 'appointment') return filters.appointments
    if (kind === 'trip') return filters.trips
    if (kind === 'event') return filters.events
    if (kind === 'request') return filters.requests
    if (kind === 'rental') return filters.rentals
    return true
  }

  const localDayKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  // Local calendar-day bucket for a stored value. Date-only strings are
  // taken as local calendar dates; datetimes convert to local time.
  // (Bucketing on the raw UTC date part shifts evening events to the
  // wrong day in negative-offset zones.)
  const dayKeyOf = (value?: string | null): string | null => {
    if (!value) return null
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!m) return null
    if (!value.includes('T')) return `${m[1]}-${m[2]}-${m[3]}`
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return null
    return localDayKey(d)
  }

  // Start minutes since midnight (local) for hour-grid positioning. Returns
  // null for date-only values, which render as all-day instead.
  const timedRange = (e: CalendarEvent): { startMin: number; endMin: number } | null => {
    if (!e.startDate || !e.startDate.includes('T')) return null
    const s = new Date(e.startDate)
    if (Number.isNaN(s.getTime())) return null
    const startMin = s.getHours() * 60 + s.getMinutes()
    let endMin = startMin + 60
    if (e.endDate && e.endDate.includes('T')) {
      const en = new Date(e.endDate)
      if (!Number.isNaN(en.getTime())) endMin = Math.max(en.getHours() * 60 + en.getMinutes(), startMin + 15)
    }
    return { startMin, endMin }
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return getEventsForDateStr(dateStr)
  }

  const getEventsForDateStr = (dateStr: string) => {
    const dayEvents = events.filter(e => {
      if (!e.startDate) return false
      if (dayKeyOf(e.startDate) !== dateStr) return false
      // Multi-day events live in the all-day row; skip timed placement here
      // only when they genuinely span (handled separately in week/day).
      return visibleKind(e.kind || 'personal')
    })
    // Add trips to day events
    const tripEvents: CalendarEvent[] = []
    trips.forEach(t => {
      if (!t.startDate || !filters.trips) return
      const tripStart = dayKeyOf(t.startDate)
      const tripEnd = t.endDate ? dayKeyOf(t.endDate) || tripStart : tripStart
      if (!tripStart) return
      if (dateStr >= tripStart && dateStr <= (tripEnd || tripStart)) {
        tripEvents.push({
          id: `trip-${t.id}`,
          title: `🗺️ ${t.title}`,
          startDate: t.startDate,
          endDate: t.endDate,
          allDay: true,
          color: '#f59e0b',
          userId: t.userId ?? '',
          visibility: t.isPublic ? 'PUBLIC' : 'PRIVATE',
          kind: 'trip' as const,
        })
      }
    })
    return [...dayEvents, ...tripEvents]
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


  const stepDate = (dir: 1 | -1) => {
    setCurrentDate(prev => {
      if (view === 'month') return new Date(prev.getFullYear(), prev.getMonth() + dir)
      const d = new Date(prev)
      d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1))
      return d
    })
  }

  const goToday = () => setCurrentDate(new Date())

  const goToDay = (d: Date) => {
    setCurrentDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
    setView('day')
  }

  const weekDays = (() => {
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  })()

  const viewTitle =
    view === 'month'
      ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : view === 'week'
        ? `Week of ${weekDays[0].toLocaleDateString()}`
        : currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  const HOUR_H = 44
  const HOURS = Array.from({ length: 24 }, (_, h) => h)

  // All-day row content for a date: trips spanning it + all-day events.
  const allDayFor = (dateStr: string) =>
    getEventsForDateStr(dateStr).filter(e => {
      if (e.kind === 'trip') return true
      if (e.allDay) return true
      const s = dayKeyOf(e.startDate)
      const en = e.endDate ? dayKeyOf(e.endDate) || s : s
      return !!s && !!en && en > s
    })

  // Timed blocks for a date (single-day placement; multi-day spans clip).
  const timedFor = (dateStr: string) =>
    getEventsForDateStr(dateStr).filter(e => {
      if (e.kind === 'trip' || e.allDay) return false
      const s = dayKeyOf(e.startDate)
      const en = e.endDate ? dayKeyOf(e.endDate) || s : s
      if (!s || !en || en > s) return false
      return timedRange(e) !== null
    })

  const fmtHour = (h: number) => {
    const h12 = h % 12 || 12
    return `${h12}${h < 12 ? 'am' : 'pm'}`
  }

  return (
    <div className={styles.calendarWidget}>
      <div className={styles.calendarHeader}>
        <h3>📅 My Planner</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div role="tablist" aria-label="Calendar view" style={{ display: 'flex', gap: 4 }}>
            {(['month', 'week', 'day'] as const).map(v => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={styles.navBtn}
                style={view === v ? { background: 'var(--accent-primary)', color: '#fff' } : undefined}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <Link href="/dashboard/appointments" className={styles.navBtn} style={{ textDecoration: 'none' }}>🗓️ Appointments</Link>
          <Link href="/dashboard/planning" className={styles.navBtn} style={{ textDecoration: 'none' }}>🗺️ Trips</Link>
          <button onClick={() => setShowAddEvent(true)} className={styles.addEventBtn}>
            + Add Event
          </button>
        </div>
      </div>

      <div className={styles.calendarFilters}>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.personal} onChange={e => setFilters(f => ({ ...f, personal: e.target.checked }))} />
          🟦 Personal
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.appointments} onChange={e => setFilters(f => ({ ...f, appointments: e.target.checked }))} />
          📅 Appointments
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.trips} onChange={e => setFilters(f => ({ ...f, trips: e.target.checked }))} />
          🟡 Trips
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.planEvents} onChange={e => setFilters(f => ({ ...f, planEvents: e.target.checked }))} />
          🟢 Project Events
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.events} onChange={e => setFilters(f => ({ ...f, events: e.target.checked }))} />
          🟣 Joined Events
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.requests} onChange={e => setFilters(f => ({ ...f, requests: e.target.checked }))} />
          🌹 Due Dates
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.rentals} onChange={e => setFilters(f => ({ ...f, rentals: e.target.checked }))} />
          🔑 Rentals
        </label>
        <label className={styles.filterChip}>
          <input type="checkbox" checked={filters.connections} onChange={e => setFilters(f => ({ ...f, connections: e.target.checked }))} />
          🟠 Connections
        </label>
      </div>

      <div className={styles.calendarNav}>
        <button onClick={() => stepDate(-1)} className={styles.navBtn}>←</button>
        <span className={styles.monthYear}>{viewTitle}</span>
        <button onClick={() => stepDate(1)} className={styles.navBtn}>→</button>
        <button onClick={goToday} className={styles.navBtn}>Today</button>
      </div>

      {view === 'month' && (
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
                <button
                  type="button"
                  className={styles.dayNumber}
                  onClick={() => goToDay(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  title="Open day view"
                >
                  {day}
                </button>
                <div className={styles.dayEvents}>
                  {dayEvents.slice(0, 3).map(e => (
                    e.link ? (
                      <Link
                        key={e.id}
                        href={e.link}
                        className={styles.eventPill}
                        style={{ backgroundColor: e.color }}
                        title={`${e.title}${e.status ? ` (${e.status})` : ''}`}
                      >
                        {e.title.slice(0, 14)}
                      </Link>
                    ) : (
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
                    )
                  ))}
                  {dayEvents.length > 3 && <span className={styles.moreEvents}>+{dayEvents.length - 3}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      )}

      {view !== 'month' && (
        <WeekDayView
          days={view === 'week' ? weekDays : [new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())]}
          allDayFor={allDayFor}
          timedFor={timedFor}
          timedRange={timedRange}
          localDayKey={localDayKey}
          hours={HOURS}
          hourH={HOUR_H}
          fmtHour={fmtHour}
          goToDay={goToDay}
          single={view === 'day'}
        />
      )}

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
          <Link href={hoveredEvent.link || `/events/${hoveredEvent.id}`} className={styles.tooltipLink}>Click to view details →</Link>
        </div>
      )}

      <div className={styles.legend}>
        <span className={styles.legendItem}>🟦 My Events</span>
        <span className={styles.legendItem}>📅 Appointments (status-colored)</span>
        <span className={styles.legendItem}>🟢 Project Events</span>
        <span className={styles.legendItem}>🟣 Joined Events</span>
        <span className={styles.legendItem}>🌹 Due Dates</span>
        <span className={styles.legendItem}>🔑 Rentals</span>
        <span className={styles.legendItem}>🟠 Connections</span>
        <span className={styles.legendItem}>🟡 Trips</span>
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