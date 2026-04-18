'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Request {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  productId: string | null
  product: {
    id: string
    title: string
    price: number | null
    imageUrl: string | null
  } | null
  user: {
    name: string | null
    email: string
  }
}

interface EventJoiner {
  id: string
  userId: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface PlanEvent {
  id: string
  title: string
  description: string | null
  eventCategory: string | null
  eventDate: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number
  currency: string
  pinned: boolean
  joiners: EventJoiner[]
}

interface Plan {
  id: string
  title: string
  description: string | null
  goals: string | null
  mileposts: string | null
  milepostStatus: string | null
  status: string
  published: boolean
  schoolId: string | null
  shopId: string | null
  requests: Request[]
  isOwner: boolean
  isEditor: boolean
  events: PlanEvent[]
}

interface Product {
  id: string
  title: string
  price: number | null
  imageUrl: string | null
  type: string
}

interface MilepostStatus {
  id: string
  completed: boolean
}

interface StatusHistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  reason: string | null
  createdAt: string
}

interface PlanDetailClientProps {
  plan: Plan
  userId: string
  isOwner?: boolean
  isEditor?: boolean
}

export default function PlanDetailClient({ plan: initialPlan, userId, isOwner: propIsOwner }: PlanDetailClientProps) {
  const [plan, setPlan] = useState(initialPlan)
  const isOwner = propIsOwner ?? plan.isOwner
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(plan.title)
  const [description, setDescription] = useState(plan.description || '')
  const [goals, setGoals] = useState(plan.goals || '')
  const [mileposts, setMileposts] = useState(plan.mileposts || '')
  const [milepostStatus, setMilepostStatus] = useState<MilepostStatus[]>(() => {
    try {
      return plan.milepostStatus ? JSON.parse(plan.milepostStatus) : []
    } catch {
      return []
    }
  })
  const [status, setStatus] = useState(plan.status)
  const [published, setPublished] = useState(plan.published || false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlanEvent | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventCategory, setEventCategory] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventLocationDetails, setEventLocationDetails] = useState('')
  const [eventMaxJoiners, setEventMaxJoiners] = useState(0)
  const [eventIsTicketed, setEventIsTicketed] = useState(false)
  const [eventTicketPrice, setEventTicketPrice] = useState(0)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [rollbackStatus, setRollbackStatus] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')

  const openEventModal = (event?: PlanEvent) => {
    if (event) {
      setEditingEvent(event)
      setEventTitle(event.title)
      setEventDesc(event.description || '')
      setEventCategory(event.eventCategory || '')
      setEventDate(event.eventDate ? event.eventDate.slice(0, 16) : '')
      setEventLocation(event.location || '')
      setEventLocationDetails(event.locationDetails || '')
      setEventMaxJoiners(event.maxJoiners)
      setEventIsTicketed(event.isTicketed || false)
      setEventTicketPrice(event.ticketPrice || 0)
    } else {
      setEditingEvent(null)
      resetEventForm()
    }
    setShowEventModal(true)
  }

  const resetEventForm = () => {
    setEventTitle('')
    setEventDesc('')
    setEventCategory('')
    setEventDate('')
    setEventLocation('')
    setEventLocationDetails('')
    setEventMaxJoiners(0)
    setEventIsTicketed(false)
    setEventTicketPrice(0)
  }

  useEffect(() => {
    if (showRequestModal) {
      fetch('/api/products?all=true')
        .then(res => res.json())
        .then(data => {
          setAvailableProducts(data.filter((p: Product) => p.type === 'PRODUCT' || p.type === 'SERVICE'))
        })
        .catch(console.error)
    }
  }, [showRequestModal])

  const handlePublish = async () => {
    setLoading(true)
    try {
      const newStatus = published ? 'DRAFT' : 'ACTIVE'
      const newPublished = !published
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: newPublished, status: newStatus })
      })
      if (res.ok) {
        setPublished(newPublished)
        setStatus(newStatus)
      }
    } catch (error) {
      console.error('Failed to publish:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description, 
          goals: goals || null,
          mileposts: mileposts || null,
          milepostStatus: JSON.stringify(milepostStatus),
          status,
          published
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setPlan({ ...plan, ...updated })
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update plan:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingEvent 
        ? `/api/plans/${plan.id}/events/${editingEvent.id}`
        : `/api/plans/${plan.id}/events`
      const method = editingEvent ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          eventCategory: eventCategory || null,
          eventDate: eventDate ? new Date(eventDate).toISOString() : null,
          location: eventLocation || null,
          locationDetails: eventLocationDetails || null,
          maxJoiners: eventMaxJoiners || 0,
          isTicketed: eventIsTicketed,
          ticketPrice: eventTicketPrice,
          currency: 'USD'
        })
      })

      if (res.ok) {
        const updatedEvent = await res.json()
        if (editingEvent) {
          setPlan({
            ...plan,
            events: plan.events.map(ev => ev.id === editingEvent.id ? { ...ev, ...updatedEvent } : ev)
          })
        } else {
          setPlan({
            ...plan,
            events: [...plan.events, { ...updatedEvent, joiners: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
          })
        }
        setShowEventModal(false)
        setEditingEvent(null)
        resetEventForm()
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        setPlan({
          ...plan,
          events: plan.events.filter(ev => ev.id !== eventId)
        })
      }
    } catch (error) {
      console.error('Failed to delete event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}/join`, { method: 'POST' })
      if (res.ok) {
        const updatedEvents = plan.events.map(ev => {
          if (ev.id === eventId) {
            return {
              ...ev,
              joiners: [...ev.joiners, { id: '', userId, joinedAt: new Date().toISOString(), user: { id: userId, name: null, email: '' } }]
            }
          }
          return ev
        })
        setPlan({ ...plan, events: updatedEvents })
      }
    } catch (error) {
      console.error('Failed to join:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}/join`, { method: 'DELETE' })
      if (res.ok) {
        const updatedEvents = plan.events.map(ev => {
          if (ev.id === eventId) {
            return { ...ev, joiners: ev.joiners.filter(j => j.userId !== userId) }
          }
          return ev
        })
        setPlan({ ...plan, events: updatedEvents })
      }
    } catch (error) {
      console.error('Failed to leave:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusHistory = async () => {
    try {
      const res = await fetch(`/api/plans/${plan.id}/status-history`)
      if (res.ok) {
        const data = await res.json()
        setStatusHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch status history:', error)
    }
  }

  const handleShowHistory = () => {
    setShowStatusHistory(true)
    fetchStatusHistory()
  }

  const handleRollback = async () => {
    if (!rollbackStatus) return
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: rollbackStatus, reason: rollbackReason })
      })
      if (res.ok) {
        const updated = await res.json()
        setPlan({ ...plan, status: updated.status, published: updated.published })
        setStatus(updated.status)
        setShowRollbackModal(false)
        setRollbackStatus('')
        setRollbackReason('')
        fetchStatusHistory()
      }
    } catch (error) {
      console.error('Failed to rollback:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: requestTitle, 
          description: requestDesc,
          planId: plan.id,
          productId: selectedProductId || null
        })
      })

      if (res.ok) {
        const newRequest = await res.json()
        const selectedProduct = selectedProductId ? availableProducts.find(p => p.id === selectedProductId) : null
        setPlan({
          ...plan,
          requests: [{ 
            ...newRequest, 
            user: { name: null, email: '' },
            productId: selectedProductId,
            product: selectedProduct ? {
              id: selectedProduct.id,
              title: selectedProduct.title,
              price: selectedProduct.price,
              imageUrl: selectedProduct.imageUrl
            } : null
          }, ...plan.requests]
        })
        setShowRequestModal(false)
        setRequestTitle('')
        setRequestDesc('')
        setSelectedProductId('')
      }
    } catch (error) {
      console.error('Failed to create request:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMilepost = (index: number) => {
    const newStatus = [...milepostStatus]
    newStatus[index] = { id: String(index), completed: !newStatus[index]?.completed }
    setMilepostStatus(newStatus)
  }

  const isUserJoinedEvent = (eventId: string) => {
    return plan.events.find(e => e.id === eventId)?.joiners.some(j => j.userId === userId) || false
  }

  const renderCalendar = () => {
    const events = plan.events.filter(e => e.eventDate)
    const months: { [key: string]: PlanEvent[] } = {}
    
    events.forEach(event => {
      if (!event.eventDate) return
      const date = new Date(event.eventDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = []
      months[key].push(event)
    })

    return (
      <div className={styles.calendarView}>
        {Object.keys(months).length === 0 ? (
          <p>No events with dates scheduled</p>
        ) : (
          Object.entries(months).map(([monthKey, monthEvents]) => {
            const [year, month] = monthKey.split('-')
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            return (
              <div key={monthKey} className={styles.calendarMonth}>
                <h4>{monthName}</h4>
                <div className={styles.calendarEvents}>
                  {monthEvents.map(event => (
                    <div key={event.id} className={styles.calendarEvent}>
                      <span className={styles.calendarDate}>
                        {new Date(event.eventDate!).toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' })}
                      </span>
                      <span className={styles.calendarTitle}>{event.title}</span>
                      {event.location && <span className={styles.calendarLocation}>{event.location}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    )
  }

  const renderMileposts = () => {
    if (!plan.mileposts) return null
    const items = plan.mileposts.split('\n').filter(m => m.trim())
    const statuses = milepostStatus.length === items.length ? milepostStatus : items.map((_, i) => milepostStatus[i] || { id: String(i), completed: false })
    
    return (
      <div className={styles.milepostsList}>
        <h4>Mileposts</h4>
        {items.map((milepost, index) => (
          <div 
            key={index} 
            className={`${styles.milepostItem} ${statuses[index]?.completed ? styles.completed : ''}`}
            onClick={() => isOwner && toggleMilepost(index)}
            style={{ cursor: isOwner ? 'pointer' : 'default' }}
          >
            <input 
              type="checkbox" 
              checked={statuses[index]?.completed || false} 
              onChange={() => isOwner && toggleMilepost(index)}
              disabled={!isOwner}
            />
            <span>{milepost}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link href="/plans" className={styles.backLink}>
        ← Back to Projects
      </Link>

      <div className={styles.content}>
        <div className={styles.mainSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              {isEditing ? (
                <form onSubmit={handleUpdate} className={styles.editForm}>
                  <div className={styles.statusRow}>
                    <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
                    <div className={styles.editActions}>
                      <button type="button" onClick={handlePublish} className={published ? "btn-secondary" : "btn-ghost"} disabled={loading}>
                        {published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button type="button" onClick={async () => { setStatus('COMPLETED'); setPublished(false); await fetch(`/api/plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED', published: false }) }); setPlan({ ...plan, status: 'COMPLETED', published: false }); }} className="btn-secondary" disabled={loading}>Complete</button>
                      <button type="button" onClick={async () => { setStatus('ARCHIVED'); setPublished(false); await fetch(`/api/plans/${plan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ARCHIVED', published: false }) }); setPlan({ ...plan, status: 'ARCHIVED', published: false }); }} className="btn-ghost" disabled={loading}>Archive</button>
                      <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className={styles.titleInput}
                    placeholder="Plan title"
                    required
                  />
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Description"
                    className={styles.descInput}
                    rows={3}
                  />
                  <div className={styles.formSection}>
                    <h3>Goals</h3>
                    <textarea
                      value={goals}
                      onChange={e => setGoals(e.target.value)}
                      placeholder="What are the goals of this plan? (one per line)"
                      className={styles.descInput}
                      rows={4}
                    />
                  </div>
                  
                  <div className={styles.formSection}>
                    <h3>Mileposts</h3>
                    <textarea
                      value={mileposts}
                      onChange={e => setMileposts(e.target.value)}
                      placeholder="Mileposts to achieve (one per line)"
                      className={styles.descInput}
                      rows={4}
                    />
                  </div>
                  
                  <div className={styles.editActions}>
                    <button type="button" onClick={() => setIsEditing(false)} className="btn-ghost">
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className={styles.titleRow}>
                    <h1>{plan.title}</h1>
                    <div className={styles.badges}>
                      {plan.published ? (
                        <span className="badge badge-published">Published</span>
                      ) : (
                        <span className={`badge badge-${plan.status.toLowerCase()}`}>
                          {plan.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {plan.description && (
                    <p className={styles.description}>{plan.description}</p>
                  )}
                  
                  {plan.goals && (
                    <div className={styles.goalsSection}>
                      <h4>Goals</h4>
                      <ul>
                        {plan.goals.split('\n').filter(g => g.trim()).map((goal, i) => (
                          <li key={i}>{goal}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {renderMileposts()}
                   
                  {isOwner && (
                    <div className={styles.ownerActions}>
                      <button 
                        onClick={handlePublish} 
                        className={published ? "btn-secondary" : "btn-primary"}
                        disabled={loading}
                      >
                        {published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => setIsEditing(true)} className={styles.editBtn}>
                        Edit Plan
                      </button>
                      <button onClick={handleShowHistory} className={styles.historyBtn}>
                        Status History
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.eventsHeader}>
              <h2>Events ({plan.events.length})</h2>
              <div className={styles.eventActions}>
                <button onClick={() => setShowCalendar(!showCalendar)} className={styles.calendarBtn}>
                  {showCalendar ? 'List View' : '📅 Calendar'}
                </button>
                {isOwner && (
                  <button onClick={() => openEventModal()} className={styles.createBtn}>
                    + Add Event
                  </button>
                )}
              </div>
            </div>

            {showCalendar ? (
              renderCalendar()
            ) : plan.events.length === 0 ? (
              <div className={styles.empty}>
                <p>No events scheduled yet</p>
              </div>
            ) : (
              <div className={styles.eventsList}>
                {plan.events.map(event => (
                  <div key={event.id} className={styles.eventCard}>
                    <div className={styles.eventInfo}>
                      <h3>{event.title}</h3>
                      {event.description && <p>{event.description}</p>}
                      {event.eventCategory && (
                        <span className={`badge badge-${event.eventCategory.toLowerCase()}`}>{event.eventCategory}</span>
                      )}
                      {event.eventDate && (
                        <p className={styles.eventDate}>
                          📅 {new Date(event.eventDate).toLocaleDateString('en-US', { 
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                        </p>
                      )}
                      {event.location && (
                        <p className={styles.eventLocation}>📍 {event.location}</p>
                      )}
                      {event.locationDetails && (
                        <p className={styles.eventLocationDetails}>{event.locationDetails}</p>
                      )}
                      {event.maxJoiners > 0 && (
                        <p className={styles.joinerCount}>
                          👥 {event.joiners.length} / {event.maxJoiners} joined
                        </p>
                      )}
                      {event.joiners.length > 0 && (
                        <div className={styles.joinersList}>
                          {event.joiners.map(joiner => (
                            <span key={joiner.id} className={styles.joinerName}>
                              {joiner.user.name || joiner.user.email}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {userId && (
                      <div className={styles.eventJoinSection}>
                        {isUserJoinedEvent(event.id) ? (
                          <button onClick={() => handleLeaveEvent(event.id)} className="btn-secondary" disabled={loading}>
                            Leave
                          </button>
                        ) : (
                          <button onClick={() => handleJoinEvent(event.id)} className="btn-primary" disabled={loading}>
                            Join
                          </button>
                        )}
                      </div>
                    )}
                    {isOwner && (
                      <div className={styles.eventActions}>
                        <button onClick={() => openEventModal(event)} className={styles.editBtn}>Edit</button>
                        <button onClick={() => handleDeleteEvent(event.id)} className={styles.deleteBtn}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.requestsSection}>
          <div className={styles.requestsHeader}>
            <h2>Requests ({plan.requests.length})</h2>
            <button onClick={() => setShowRequestModal(true)} className={styles.createBtn}>
              + New Request
            </button>
          </div>

          {plan.requests.length === 0 ? (
            <div className={styles.empty}>
              <p>No requests yet</p>
            </div>
          ) : (
            <div className={styles.requestList}>
              {plan.requests.map(req => (
                <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestItem}>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestTitle}>{req.title}</span>
                    {req.description && (
                      <span className={styles.requestDesc}>{req.description}</span>
                    )}
                    {req.product && (
                      <span className={styles.productBadge}>
                        From Marketplace: {req.product.title}
                        {req.product.price && ` - $${req.product.price}`}
                      </span>
                    )}
                  </div>
                  <span className={`badge badge-${req.status.toLowerCase()}`}>
                    {req.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="Event title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={eventDesc}
                  onChange={e => setEventDesc(e.target.value)}
                  placeholder="Event description"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={eventCategory} onChange={e => setEventCategory(e.target.value)}>
                  <option value="">Select Category</option>
                  <option value="WEDDING">Wedding</option>
                  <option value="CORPORATE">Corporate Event</option>
                  <option value="BIRTHDAY">Birthday Party</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="CONCERT">Concert</option>
                  <option value="EXHIBITION">Exhibition</option>
                  <option value="SPORTS">Sports Event</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Location Type</label>
                <select value={eventLocation} onChange={e => setEventLocation(e.target.value)}>
                  <option value="">Select Location Type</option>
                  <option value="INDOOR">Indoor</option>
                  <option value="OUTDOOR">Outdoor</option>
                  <option value="VENUE">External Venue</option>
                  <option value="ONLINE">Online</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Location Details</label>
                <textarea
                  value={eventLocationDetails}
                  onChange={e => setEventLocationDetails(e.target.value)}
                  placeholder="Address, venue name, link, etc."
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label>Max Joiners (0 = unlimited)</label>
                <input
                  type="number"
                  value={eventMaxJoiners}
                  onChange={e => setEventMaxJoiners(parseInt(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={eventIsTicketed}
                    onChange={e => setEventIsTicketed(e.target.checked)}
                  />
                  <span>Ticketed Event (charge for tickets)</span>
                </label>
              </div>
              {eventIsTicketed && (
                <div className="form-group">
                  <label>Ticket Price (USD)</label>
                  <input
                    type="number"
                    value={eventTicketPrice}
                    onChange={e => setEventTicketPrice(parseFloat(e.target.value) || 0)}
                    min={0}
                    step={0.01}
                  />
                </div>
              )}
              <div className={styles.modalActions}>
                <button type="button" onClick={() => { setShowEventModal(false); resetEventForm(); }} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Request</h2>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={requestTitle}
                  onChange={e => setRequestTitle(e.target.value)}
                  placeholder="Request title"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={requestDesc}
                  onChange={e => setRequestDesc(e.target.value)}
                  placeholder="Describe what you need"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Add from Marketplace (optional)</label>
                <select 
                  value={selectedProductId} 
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">-- Select a product --</option>
                  {availableProducts.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.title} {product.price ? `$${product.price}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowRequestModal(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusHistory && (
        <div className="modal-overlay" onClick={() => setShowStatusHistory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Status History</h2>
              <button onClick={() => setShowStatusHistory(false)} className="btn-ghost">×</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {statusHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No status changes recorded yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <span className={`badge badge-${plan.status.toLowerCase()}`}>{plan.status}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Current Status</span>
                  </div>
                  {statusHistory.map(entry => (
                    <div key={entry.id} style={{ padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {entry.fromStatus && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{entry.fromStatus} →</span>}
                          <span className={`badge badge-${entry.toStatus.toLowerCase()}`}>{entry.toStatus}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.reason && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{entry.reason}</p>
                      )}
                      {plan.status !== entry.toStatus && isOwner && (
                        <button 
                          onClick={() => { setShowStatusHistory(false); setRollbackStatus(entry.toStatus); setShowRollbackModal(true); }}
                          className="btn-ghost"
                          style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                        >
                          Rollback to this status
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRollbackModal && (
        <div className="modal-overlay" onClick={() => setShowRollbackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm Rollback</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Change status from <strong>{plan.status}</strong> to <strong>{rollbackStatus}</strong>?
            </p>
            <div className="form-group">
              <label>Reason (optional)</label>
              <input
                type="text"
                value={rollbackReason}
                onChange={e => setRollbackReason(e.target.value)}
                placeholder="Why are you rolling back?"
              />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowRollbackModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleRollback} className="btn-primary" disabled={loading}>
                {loading ? 'Rolling back...' : 'Confirm Rollback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
