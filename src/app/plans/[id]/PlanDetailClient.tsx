'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import styles from './page.module.css'
import PlanGoals from './PlanGoals'
import PlanMilestones from './PlanMilestones'
import PlanResources from './PlanResources'
import PlanSupport from './PlanSupport'
import { parseGoals, parseMilestones, parseResources, stringifyGoals, stringifyMilestones, stringifyResources } from '@/lib/plan-utils'
import { getUserProfileUrl } from '@/lib/utils'
import EntityActions from '@/components/EntityActions'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import CollaborateButton from '@/components/CollaborateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import DonationAddressPicker from '@/components/DonationAddressPicker'

const PlanMapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false })
const PlanTileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false })
const PlanMarker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false })
const PlanPopup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false })
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import type { DonationAddr } from '@/types/product'
import type { PlanGoal, PlanMilestone, PlanResource, PlanContribution, PlanJoiner } from '@/lib/plan-utils'
import type { EventFormData } from '@/components/EventFormFields'
import TranslateButton from '@/components/TranslateButton'
import HashtagInput from '@/components/HashtagInput'

interface Request {
  id: string; title: string; description: string | null; status: string
  createdAt: string; productId: string | null
  product: { id: string; title: string; price: number | null; imageUrl: string | null } | null
  user: { name: string | null; email: string }
}

interface EventJoiner {
  id: string; userId: string; joinedAt: string
  user: { id: string; name: string | null; email: string }
}

interface PlanEvent {
  id: string; title: string; description: string | null
  eventCategory: string | null; eventDate: string | null; endDate: string | null
  location: string | null; locationDetails: string | null
  latitude: number | null; longitude: number | null
  maxJoiners: number; isTicketed: boolean; ticketPrice: number; currency: string
  pinned: boolean; joiners: EventJoiner[]; createdAt: string; updatedAt: string
}

interface Plan {
  id: string; title: string; description: string | null
  goals: string | null; mileposts: string | null; milepostStatus: string | null; resources: string | null
  status: string; published: boolean; schoolId: string | null; shopId: string | null
  lookingForCollaborators: boolean
  imageUrl: string | null
  location: string | null
  latitude: number | null
  longitude: number | null
  requests: Request[]; isOwner: boolean; isEditor: boolean; events: PlanEvent[]
  goalAmount: number | null; currentFunding: number | null
  donationAddress: string | null; donationCurrency: string; donationAddresses: string | null
  acceptsDonations: boolean; donationDescription: string | null
  needsVolunteers: boolean; volunteerRoles: string | null; volunteerDescription: string | null
  joiners: PlanJoiner[]; contributions: PlanContribution[]
  user: { id: string; name: string | null; username: string | null; image?: string | null }
}

interface Product { id: string; title: string; price: number | null; imageUrl: string | null; type: string }

interface MilepostStatus { id: string; completed: boolean }

interface StatusHistoryEntry { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }

interface PlanDetailClientProps { plan: Plan; userId: string; isOwner?: boolean }

type TabKey = 'overview' | 'goals' | 'milestones' | 'resources' | 'support' | 'events'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'goals', label: 'Goals', icon: '🎯' },
  { key: 'milestones', label: 'Milestones', icon: '🏁' },
  { key: 'resources', label: 'Resources', icon: '📚' },
  { key: 'support', label: 'Support', icon: '💰' },
  { key: 'events', label: 'Events', icon: '📅' },
]

export default function PlanDetailClient({ plan: initialPlan, userId, isOwner: propIsOwner }: PlanDetailClientProps) {
  const [plan, setPlan] = useState(initialPlan)
  const isOwner = propIsOwner ?? plan.isOwner
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [planGoals, setPlanGoals] = useState<PlanGoal[]>(() => parseGoals(initialPlan.goals))
  const [planMilestones, setPlanMilestones] = useState<PlanMilestone[]>(() => parseMilestones(initialPlan.mileposts, initialPlan.milepostStatus))
  const [planResources, setPlanResources] = useState<PlanResource[]>(() => parseResources(initialPlan.resources))

  const [editedTitle, setEditedTitle] = useState(plan.title)
  const [editedDescription, setEditedDescription] = useState(plan.description || '')
  const [planHashtags, setPlanHashtags] = useState<string[]>([])
  const [editingOverview, setEditingOverview] = useState(false)

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [editingEvent, setEditingEvent] = useState<PlanEvent | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [editDonations, setEditDonations] = useState(false)
  const [editAcceptsDonations, setEditAcceptsDonations] = useState(plan.acceptsDonations)
  const [editSelectedDonationAddrs, setEditSelectedDonationAddrs] = useState<DonationAddr[]>(() => hydrateDonationAddresses(plan.donationAddress, plan.donationCurrency, plan.donationAddresses))
  const [editDonationDescription, setEditDonationDescription] = useState(plan.donationDescription || '')
  const userDonationAddrs = useDonationAddresses()

  const [eventFormData, setEventFormData] = useState<EventFormData>(() => getDefaultEventFormData())
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [rollbackStatus, setRollbackStatus] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')
  const [saveError, setSaveError] = useState('')

  const openEventModal = (event?: PlanEvent) => {
    if (event) {
      setEditingEvent(event)
      setEventFormData({
        title: event.title,
        description: event.description || '',
        imageUrl: '',
        images: [],
        eventCategory: event.eventCategory || 'GENERAL',
        eventDate: event.eventDate ? event.eventDate.slice(0, 16) : '',
        endDate: event.endDate ? event.endDate.slice(0, 16) : '',
        location: event.location || '',
        locationDetails: event.locationDetails || '',
        maxJoiners: event.maxJoiners,
        isTicketed: event.isTicketed || false,
        ticketPrice: event.ticketPrice || 0,
        currency: event.currency || 'USD',
        visibility: 'PUBLIC',
        eventType: 'public',
        needsVolunteers: false,
        volunteerRoles: '',
        volunteerDescription: '',
        acceptsDonations: false,
        selectedDonationAddrs: [],
        hashtags: [],
        planId: plan.id,
        planTitle: plan.title || null,
        groupId: null,
        groupTitle: null,
        schoolId: null,
        shopId: null,
      })
    } else {
      setEditingEvent(null)
      setEventFormData(getDefaultEventFormData())
    }
    setShowEventModal(true)
  }

  useEffect(() => {
    if (showRequestModal) {
      fetch('/api/products?all=true')
        .then(res => res.json())
        .then((data: Product[]) => setAvailableProducts(data.filter(p => p.type === 'PRODUCT' || p.type === 'SERVICE')))
        .catch(console.error)
    }
  }, [showRequestModal])

  const saveField = useCallback(async (data: Record<string, unknown>) => {
    setSaveError('')
    const res = await fetch(`/api/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to save')
    }
    return res.json()
  }, [plan.id])

  const handleSaveOverview = async () => {
    setLoading(true)
    try {
      const updated = await saveField({ title: editedTitle, description: editedDescription || null, hashtags: planHashtags })
      setPlan({ ...plan, ...updated })
      setEditingOverview(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleGoalsChange = async (goals: PlanGoal[]) => {
    setPlanGoals(goals)
    const updated = await saveField({ goals: stringifyGoals(goals), milepostStatus: stringifyMilestones(planMilestones) })
    setPlan(p => ({ ...p, ...updated, milepostStatus: stringifyMilestones(planMilestones) }))
  }

  const handleMilestonesChange = async (milestones: PlanMilestone[]) => {
    setPlanMilestones(milestones)
    const updated = await saveField({ mileposts: stringifyMilestones(milestones) })
    setPlan(p => ({ ...p, ...updated }))
  }

  const handleResourcesChange = async (resources: PlanResource[]) => {
    setPlanResources(resources)
    const updated = await saveField({ resources: stringifyResources(resources) })
    setPlan(p => ({ ...p, ...updated }))
  }

  const handlePublish = async () => {
    setLoading(true)
    try {
      const newPublished = !plan.published
      const newStatus = plan.published ? 'DRAFT' : 'ACTIVE'
      const updated = await saveField({ published: newPublished, status: newStatus })
      setPlan({ ...plan, ...updated })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string, newPublished?: boolean) => {
    setLoading(true)
    try {
      const updated = await saveField({ status: newStatus, published: newPublished ?? plan.published })
      setPlan({ ...plan, ...updated })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCollab = async () => {
    setLoading(true)
    try {
      const updated = await saveField({ lookingForCollaborators: !plan.lookingForCollaborators })
      setPlan({ ...plan, ...updated })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update collaboration setting')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const url = editingEvent ? `/api/plans/${plan.id}/events/${editingEvent.id}` : `/api/plans/${plan.id}/events`
      const method = editingEvent ? 'PUT' : 'POST'

      let volunteerRoles = eventFormData.volunteerRoles
      if (eventFormData.needsVolunteers && volunteerRoles) {
        try { JSON.parse(volunteerRoles) } catch {
          volunteerRoles = JSON.stringify(volunteerRoles.split(',').map(r => r.trim()).filter(Boolean))
        }
      }

      const payload: Record<string, unknown> = {
        title: eventFormData.title,
        description: eventFormData.description,
        eventCategory: eventFormData.eventCategory,
        eventDate: eventFormData.eventDate ? new Date(eventFormData.eventDate).toISOString() : null,
        endDate: eventFormData.endDate ? new Date(eventFormData.endDate).toISOString() : null,
        location: eventFormData.location || null,
        locationDetails: eventFormData.locationDetails || null,
        maxJoiners: eventFormData.maxJoiners || 0,
        isTicketed: eventFormData.isTicketed,
        ticketPrice: eventFormData.ticketPrice,
        currency: eventFormData.currency,
        needsVolunteers: eventFormData.needsVolunteers,
        volunteerRoles: eventFormData.needsVolunteers ? volunteerRoles : null,
        volunteerDescription: eventFormData.needsVolunteers ? eventFormData.volunteerDescription : null,
        hashtags: eventFormData.hashtags,
      }

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) {
        const updatedEvent = await res.json()
        if (editingEvent) {
          setPlan(prev => ({ ...prev, events: prev.events.map(ev => ev.id === editingEvent!.id ? { ...ev, ...updatedEvent, createdAt: ev.createdAt, updatedAt: ev.updatedAt } : ev) }))
        } else {
          const now = new Date().toISOString()
          const newEvent: PlanEvent = {
            id: updatedEvent.id, title: eventFormData.title, description: eventFormData.description || null,
            eventCategory: eventFormData.eventCategory || null, eventDate: eventFormData.eventDate ? new Date(eventFormData.eventDate).toISOString() : null,
            endDate: eventFormData.endDate ? new Date(eventFormData.endDate).toISOString() : null,
            location: eventFormData.location || null, locationDetails: eventFormData.locationDetails || null,
            latitude: null, longitude: null, maxJoiners: eventFormData.maxJoiners || 0,
            isTicketed: eventFormData.isTicketed, ticketPrice: eventFormData.ticketPrice, currency: eventFormData.currency,
            pinned: false, joiners: [], createdAt: now, updatedAt: now
          }
          setPlan(prev => ({ ...prev, events: [...prev.events, newEvent] }))
        }
        setShowEventModal(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save event')
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) setPlan({ ...plan, events: plan.events.filter(ev => ev.id !== eventId) })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}/join`, { method: 'POST' })
      if (res.ok) {
        setPlan({ ...plan, events: plan.events.map(ev => ev.id === eventId ? { ...ev, joiners: [...ev.joiners, { id: '', userId, joinedAt: new Date().toISOString(), user: { id: userId, name: null, email: '' } }] } : ev) })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLeaveEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/plans/${plan.id}/events/${eventId}/join`, { method: 'DELETE' })
      if (res.ok) setPlan({ ...plan, events: plan.events.map(ev => ev.id === eventId ? { ...ev, joiners: ev.joiners.filter(j => j.userId !== userId) } : ev) })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusHistory = async () => {
    try {
      const res = await fetch(`/api/plans/${plan.id}/status-history`)
      if (res.ok) setStatusHistory(await res.json())
    } catch (err) {
      console.error(err)
    }
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
        setShowRollbackModal(false)
        setRollbackStatus('')
        setRollbackReason('')
        fetchStatusHistory()
      }
    } catch (err) {
      console.error(err)
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
        body: JSON.stringify({ title: requestTitle, description: requestDesc, planId: plan.id, productId: selectedProductId || null })
      })
      if (res.ok) {
        const newRequest = await res.json()
        const selectedProduct = selectedProductId ? availableProducts.find(p => p.id === selectedProductId) : null
        setPlan({ ...plan, requests: [{ ...newRequest, user: { name: null, email: '' }, productId: selectedProductId, product: selectedProduct ? { id: selectedProduct.id, title: selectedProduct.title, price: selectedProduct.price, imageUrl: selectedProduct.imageUrl } : null }, ...plan.requests] })
        setShowRequestModal(false)
        setRequestTitle(''); setRequestDesc(''); setSelectedProductId('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isUserJoinedEvent = (eventId: string) => plan.events.find(e => e.id === eventId)?.joiners.some(j => j.userId === userId) || false

  const renderCalendar = () => {
    const events = plan.events.filter(e => e.eventDate)
    const months: Record<string, PlanEvent[]> = {}
    events.forEach(event => {
      if (!event.eventDate) return
      const date = new Date(event.eventDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = []
      months[key].push(event)
    })
    return (
      <div className={styles.calendarView}>
        {Object.keys(months).length === 0 ? <p>No events with dates scheduled</p> : (
          Object.entries(months).map(([monthKey, monthEvents]) => {
            const [year, month] = monthKey.split('-')
            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            return (
              <div key={monthKey} className={styles.calendarMonth}>
                <h4>{monthName}</h4>
                <div className={styles.calendarEvents}>
                  {monthEvents.map(event => (
                    <div key={event.id} className={styles.calendarEvent}>
                      <span className={styles.calendarDate}>{new Date(event.eventDate!).toLocaleDateString('en-US', { day: 'numeric', weekday: 'short' })}</span>
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

  const totalGoals = planGoals.length
  const completedGoals = planGoals.filter(g => g.status === 'completed').length
  const totalMilestones = planMilestones.length
  const completedMilestones = planMilestones.filter(m => m.completed).length
  const totalResources = planResources.length
  const completedResources = planResources.filter(r => r.completed).length
  const totalItems = totalGoals + totalMilestones + totalResources
  const completedItems = completedGoals + completedMilestones + completedResources
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className={styles.page}>
        <Link href="/dashboard/projects" className={styles.backLink}>← Back to Projects</Link>

        <div className={styles.creatorInfo}>
          <Link href={getUserProfileUrl(plan.user)} className={styles.creatorLink}>
            {plan.user.image ? (
              <Image src={plan.user.image} alt="" width={32} height={32} className={styles.creatorAvatar} />
            ) : (
              <span className={styles.creatorAvatarPlaceholder}>{plan.user.name?.[0] || 'U'}</span>
            )}
            <span className={styles.creatorName}>{plan.user.name || 'Anonymous'}</span>
          </Link>
        </div>

        <div className={styles.content}>
        <div className={styles.mainSection}>
          {saveError && (
            <div className={styles.errorBanner}>
              {saveError}
              <button onClick={() => setSaveError('')} className={styles.errorClose}>✕</button>
            </div>
          )}

          {/* Tab Bar */}
          <div className={styles.tabBar}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className={styles.tabPanel}>
              {editingOverview ? (
                <div className={styles.overviewEdit}>
                  <div className={styles.statusRow}>
                    <span className={`badge badge-${plan.status.toLowerCase()}`}>{plan.status}</span>
                    <div className={styles.editActions}>
                      <button onClick={() => setEditingOverview(false)} className="btn-ghost" disabled={loading}>Cancel</button>
                      <button onClick={handleSaveOverview} className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                  <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className={styles.titleInput} />
                  <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} className={styles.descInput} rows={3} />
                  <div className={styles.field} style={{ marginTop: '12px' }}>
                    <label>Hashtags</label>
                    <HashtagInput value={planHashtags} onChange={setPlanHashtags} placeholder="Add hashtags..." />
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.overviewHeader}>
                    <div>
                      <div className={styles.titleRow}>
                        <h1>{plan.title}</h1>
                        <button onClick={() => navigator.clipboard.writeText(window.location.href)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px', borderRadius: 6 }} title="Copy link">🔗</button>
                        <div className={styles.badges}>
                          {plan.published ? <span className="badge badge-published">Published</span> : <span className={`badge badge-${plan.status.toLowerCase()}`}>{plan.status}</span>}
                          {plan.lookingForCollaborators && <span className="badge" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>🤝 Looking for collaborators</span>}
                        </div>
                      </div>
                      {plan.imageUrl && (
                        <div style={{ margin: '16px 0', borderRadius: '12px', overflow: 'hidden', maxHeight: 300 }}>
                          <img src={plan.imageUrl} alt={plan.title} style={{ width: '100%', height: 'auto', maxHeight: 300, objectFit: 'cover', borderRadius: 12 }} />
                        </div>
                      )}
                      {plan.description && <p className={styles.description}>{plan.description}</p>}
                      {plan.description && <TranslateButton text={plan.description} />}
                      {userId && !isOwner && (
                        <div style={{ margin: '12px 0' }}>
                          <CollaborateButton entityType="PLAN" entityId={plan.id} label="🤝 Join as Collaborator" variant="secondary" />
                        </div>
                      )}
                      {userId && (
                        <div style={{ margin: '12px 0' }}>
                          <PinToBoardButton
                            entityType="PLAN"
                            entityId={plan.id}
                            entityTitle={plan.title}
                            entityImage={plan.imageUrl || undefined}
                            entityLatitude={plan.latitude || undefined}
                            entityLongitude={plan.longitude || undefined}
                            variant="ghost"
                              label="Pin to Board"
                          />
                        </div>
                      )}
                      <EntityActions
                        entityType="PLAN"
                        entityId={plan.id}
                        title={plan.title}
                        authorId={plan.user.id}
                        image={plan.imageUrl}
                        variant="bar"
                      />

                      {(plan.location || (plan.latitude && plan.longitude)) && (
                        <div className={styles.locationSection}>
                          <h4 className={styles.locationTitle}>📍 Location</h4>
                          {plan.location && <p className={styles.locationText}>{plan.location}</p>}
                          {plan.latitude && plan.longitude && (
                            <div className={styles.locationMapWrap}>
                              <PlanMapContainer center={[plan.latitude, plan.longitude]} zoom={13} className={styles.locationMap} scrollWheelZoom={false}>
                                <PlanTileLayer
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <PlanMarker position={[plan.latitude, plan.longitude]}>
                                  <PlanPopup>{plan.location || plan.title}</PlanPopup>
                                </PlanMarker>
                              </PlanMapContainer>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Overall Progress */}
                  {totalItems > 0 && (
                    <div className={styles.progressSection}>
                      <div className={styles.progressHeader}>
                        <span>Overall Progress</span>
                        <span>{overallProgress}%</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <svg width="48" height="48" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent-success)" strokeWidth="3" strokeDasharray={`${overallProgress}, 100`} />
                        </svg>
                        <div style={{ flex: 1 }}>
                          <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className={styles.statsRow}>
                    <div className={styles.statChip} onClick={() => setActiveTab('goals')} style={{ cursor: 'pointer' }}>
                      <span className={styles.statChipIcon}>🎯</span>
                      <span>{completedGoals}/{totalGoals} Goals</span>
                    </div>
                    <div className={styles.statChip} onClick={() => setActiveTab('milestones')} style={{ cursor: 'pointer' }}>
                      <span className={styles.statChipIcon}>🏁</span>
                      <span>{completedMilestones}/{totalMilestones} Milestones</span>
                    </div>
                    <div className={styles.statChip} onClick={() => setActiveTab('resources')} style={{ cursor: 'pointer' }}>
                      <span className={styles.statChipIcon}>📚</span>
                      <span>{completedResources}/{totalResources} Resources</span>
                    </div>
                    <div className={styles.statChip}>
                      <span className={styles.statChipIcon}>📅</span>
                      <span>{plan.events.length} Events</span>
                    </div>
                    <div className={styles.statChip}>
                      <span className={styles.statChipIcon}>📝</span>
                      <span>{plan.requests.length} Requests</span>
                    </div>
                    {plan.goalAmount && plan.goalAmount > 0 && (
                      <div className={styles.statChip}>
                        <span className={styles.statChipIcon}>💰</span>
                        <span>${plan.currentFunding || 0} / ${plan.goalAmount}</span>
                      </div>
                    )}
                    {plan.needsVolunteers && (
                      <div className={styles.statChip}>
                        <span className={styles.statChipIcon}>🤝</span>
                        <span>Volunteers Needed</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  {isOwner && (
                    <div className={styles.overviewActions}>
                      <button onClick={() => setEditingOverview(true)} className={styles.overviewActionBtn}>Edit Details</button>
                      <button onClick={handlePublish} className={plan.published ? 'btn-secondary' : 'btn-primary'} disabled={loading}>
                        {plan.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={handleToggleCollab} className={plan.lookingForCollaborators ? 'btn-secondary' : 'btn-primary'} disabled={loading}>
                        {plan.lookingForCollaborators ? '🤝 Open to Collab' : '🤝 Looking for Collaborators'}
                      </button>
                      {plan.status !== 'COMPLETED' && (
                        <button onClick={() => handleStatusChange('COMPLETED', false)} className="btn-secondary" disabled={loading}>Mark Complete</button>
                      )}
                      {plan.status !== 'ARCHIVED' && (
                        <button onClick={() => handleStatusChange('ARCHIVED', false)} className="btn-ghost" disabled={loading}>Archive</button>
                      )}
                      <button onClick={() => { setShowStatusHistory(true); fetchStatusHistory(); }} className={styles.historyBtn}>Status History</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className={styles.tabPanel}>
              <PlanGoals goals={planGoals} isOwner={isOwner} onChange={handleGoalsChange} />
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div className={styles.tabPanel}>
              <PlanMilestones milestones={planMilestones} isOwner={isOwner} onChange={handleMilestonesChange} />
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className={styles.tabPanel}>
              <PlanResources resources={planResources} isOwner={isOwner} onChange={handleResourcesChange} />
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className={styles.tabPanel}>
              {isOwner && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0 }}>Donation Settings</h3>
                    <button
                      onClick={() => {
                        if (editDonations) {
                          setEditAcceptsDonations(plan.acceptsDonations)
                          setEditSelectedDonationAddrs(hydrateDonationAddresses(plan.donationAddress, plan.donationCurrency, plan.donationAddresses))
                          setEditDonationDescription(plan.donationDescription || '')
                        }
                        setEditDonations(!editDonations)
                      }}
                      className="btn-ghost"
                      style={{ fontSize: '0.85rem' }}
                    >
                      {editDonations ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {editDonations ? (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                        <input type="checkbox" checked={editAcceptsDonations} onChange={e => setEditAcceptsDonations(e.target.checked)} />
                        Accept Donations
                      </label>
                      {editAcceptsDonations && (
                        <>
<DonationAddressPicker
                             savedAddresses={userDonationAddrs}
                             selectedAddresses={editSelectedDonationAddrs}
                             onAddressesChange={(addrs) => setEditSelectedDonationAddrs(addrs)}
                           />
                          <div className="form-group" style={{ marginTop: 8 }}>
                            <label>Donation Description</label>
                            <textarea
                              value={editDonationDescription}
                              onChange={e => setEditDonationDescription(e.target.value)}
                              placeholder="What will donations be used for?"
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                      <button
                        onClick={async () => {
                          setLoading(true)
                          try {
                            const legacy = donationAddressesToLegacy(editAcceptsDonations ? editSelectedDonationAddrs : [])
                            const updated = await saveField({
                              acceptsDonations: editAcceptsDonations,
                              ...legacy,
                              donationAddresses: editAcceptsDonations ? serializeDonationAddresses(editSelectedDonationAddrs) : null,
                              donationDescription: editAcceptsDonations ? (editDonationDescription || null) : null
                            })
                            setPlan({ ...plan, ...updated })
                            setEditDonations(false)
                          } catch (err) {
                            setSaveError(err instanceof Error ? err.message : 'Failed to update donation settings')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: 8 }}
                      >
                        {loading ? 'Saving...' : 'Save Donation Settings'}
                      </button>
                    </>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {plan.acceptsDonations ? 'This project accepts donations.' : 'Donations are not enabled for this project.'}
                      {plan.donationAddress && ` Address: ${plan.donationAddress.slice(0, 6)}...${plan.donationAddress.slice(-4)}`}
                    </p>
                  )}
                </div>
              )}
              <PlanSupport
                planId={plan.id}
                currentFunding={plan.currentFunding}
                goalAmount={plan.goalAmount}
                donationAddress={plan.donationAddress}
                donationCurrency={plan.donationCurrency}
donationDescription={plan.donationDescription}
                 donationAddresses={plan.donationAddresses}
                 acceptsDonations={plan.acceptsDonations}
                needsVolunteers={plan.needsVolunteers}
                volunteerRoles={plan.volunteerRoles}
                volunteerDescription={plan.volunteerDescription}
                joiners={plan.joiners}
                contributions={plan.contributions}
                userId={userId}
                isOwner={isOwner}
              />
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className={styles.tabPanel}>
              <div className={styles.eventsHeader}>
                <h2>Events ({plan.events.length})</h2>
                <div className={styles.eventActions}>
                  <button onClick={() => setShowCalendar(!showCalendar)} className={styles.calendarBtn}>
                    {showCalendar ? 'List View' : '📅 Calendar'}
                  </button>
                  {isOwner && <button onClick={() => openEventModal()} className={styles.createBtn}>+ Add Event</button>}
                </div>
              </div>

              {showCalendar ? renderCalendar() : plan.events.length === 0 ? (
                <div className={styles.empty}><p>No events scheduled yet</p></div>
              ) : (
                <div className={styles.eventsList}>
                  {plan.events.map(event => (
                    <div key={event.id} className={styles.eventCard}>
                      <div className={styles.eventInfo}>
                        <h3><Link href={`/events/${event.id}`} className={styles.eventTitleLink}>{event.title}</Link></h3>
                        {event.description && <p>{event.description}</p>}
                        {event.eventCategory && <span className={styles.eventBadge}>{event.eventCategory}</span>}
                        {event.eventDate && <p className={styles.eventDate}>📅 {new Date(event.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>}
                        {event.location && <p className={styles.eventLocation}>📍 {event.location}</p>}
                        {event.locationDetails && <p className={styles.eventLocationDetails}>{event.locationDetails}</p>}
                        {event.maxJoiners > 0 && <p className={styles.joinerCount}>👥 {event.joiners.length} / {event.maxJoiners} joined</p>}
                        {event.joiners.length > 0 && (
                          <div className={styles.joinersList}>
                            {event.joiners.map(joiner => <span key={joiner.id} className={styles.joinerName}>{joiner.user.name || joiner.user.email}</span>)}
                          </div>
                        )}
                      </div>
                      {userId && (
                        <div className={styles.joinSection}>
                          {isUserJoinedEvent(event.id) ? (
                            <button onClick={() => handleLeaveEvent(event.id)} className="btn-secondary" disabled={loading}>Leave</button>
                          ) : (
                            <button onClick={() => handleJoinEvent(event.id)} className="btn-primary" disabled={loading}>Join</button>
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
          )}
        </div>

        {/* Requests Sidebar */}
        <div className={styles.requestsSection}>
          <div className={styles.requestsHeader}>
            <h2>Requests ({plan.requests.length})</h2>
            <button onClick={() => setShowRequestModal(true)} className={styles.createBtn}>+ New</button>
          </div>
          {plan.requests.length === 0 ? (
            <div className={styles.empty}><p>No requests yet</p></div>
          ) : (
            <div className={styles.requestList}>
              {plan.requests.map(req => (
                <Link key={req.id} href={`/requests/${req.id}`} className={styles.requestItem}>
                  <div className={styles.requestInfo}>
                    <span className={styles.requestTitle}>{req.title}</span>
                    {req.description && <span className={styles.requestDesc}>{req.description}</span>}
                    {req.product && <span className={styles.productBadge}>From: {req.product.title}{req.product.price && ` - $${req.product.price}`}</span>}
                  </div>
                  <span className={`badge badge-${req.status.toLowerCase()}`}>{req.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <LinkedItemsSection
        entityType="PLAN"
        entityId={plan.id}
        currentUserId={userId}
      />

      {/* Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingEvent ? 'Edit Event' : 'Add Event'}</h2>
            <EventFormFields
              formData={eventFormData}
              onChange={(patch) => setEventFormData(prev => ({ ...prev, ...patch }))}
              onSubmit={handleCreateEvent}
              mode="edit"
              saving={loading}
              onCancel={() => setShowEventModal(false)}
              submitLabel={editingEvent ? 'Update' : 'Create'}
              fixedPlanId={plan.id}
              fixedPlanTitle={plan.title || undefined}
            />
          </div>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create Request</h2>
            <form onSubmit={handleCreateRequest}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" value={requestTitle} onChange={e => setRequestTitle(e.target.value)} placeholder="Request title" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={requestDesc} onChange={e => setRequestDesc(e.target.value)} placeholder="Describe what you need" rows={4} />
              </div>
              <div className="form-group">
                <label>Add from Marketplace (optional)</label>
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                  <option value="">-- Select --</option>
                  {availableProducts.map(p => <option key={p.id} value={p.id}>{p.title} {p.price ? `$${p.price}` : ''}</option>)}
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status History Modal */}
      {showStatusHistory && (
        <div className="modal-overlay" onClick={() => setShowStatusHistory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Status History</h2>
              <button onClick={() => setShowStatusHistory(false)} className="btn-ghost">×</button>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {statusHistory.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No status changes recorded yet.</p>
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
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      {entry.reason && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>{entry.reason}</p>}
                      {plan.status !== entry.toStatus && isOwner && (
                        <button onClick={() => { setShowStatusHistory(false); setRollbackStatus(entry.toStatus); setShowRollbackModal(true); }} className="btn-ghost" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Rollback</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      {showRollbackModal && (
        <div className="modal-overlay" onClick={() => setShowRollbackModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm Rollback</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Change status from <strong>{plan.status}</strong> to <strong>{rollbackStatus}</strong>?
            </p>
            <div className="form-group">
              <label>Reason (optional)</label>
              <input type="text" value={rollbackReason} onChange={e => setRollbackReason(e.target.value)} placeholder="Why are you rolling back?" />
            </div>
            <div className={styles.modalActions}>
              <button onClick={() => setShowRollbackModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleRollback} className="btn-primary" disabled={loading}>{loading ? 'Rolling back...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      </div>
  )
}
