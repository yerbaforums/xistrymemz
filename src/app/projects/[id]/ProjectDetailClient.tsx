'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import styles from './page.module.css'
import ProjectGoals from './ProjectGoals'
import ProjectMilestones from './ProjectMilestones'
import ProjectResources from './ProjectResources'
import ProjectSupport from './ProjectSupport'
import ProjectUpdates from './ProjectUpdates'
import { parseGoals, parseMilestones, parseResources, stringifyGoals, stringifyMilestones, stringifyResources } from '@/lib/project-utils'
import { getUserProfileUrl } from '@/lib/utils'
import ShareBar from '@/components/ShareBar'
import EntityActions from '@/components/EntityActions'
import LinkedItemsSection from '@/components/LinkedItemsSection'
import CollaborateButton from '@/components/CollaborateButton'
import PinToBoardButton from '@/components/PinToBoardButton'
import DonationAddressPicker from '@/components/DonationAddressPicker'

import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import { hydrateDonationAddresses, serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import type { DonationAddr } from '@/types/product'
import type { ProjectGoal, ProjectMilestone, ProjectResource, ProjectContribution, ProjectJoiner } from '@/lib/project-utils'
import type { EventFormData } from '@/components/EventFormFields'
import TranslateButton from '@/components/TranslateButton'
import ImageUploader from '@/components/ImageUploader'
import HashtagInput from '@/components/HashtagInput'
import LocationPicker from '@/components/LocationPicker'
import { PROJECT_CATEGORIES } from '@/lib/project-categories'
import { EmptyState } from '@/components/EmptyState'
import { MapContainer as ProjectMapContainer, TileLayer as ProjectTileLayer, Marker as ProjectMarker, Popup as ProjectPopup } from '@/components/LeafletComponents'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/context/ToastContext'

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

interface ProjectEvent {
  id: string; title: string; description: string | null
  eventCategory: string | null; eventDate: string | null; endDate: string | null
  location: string | null; locationDetails: string | null
  latitude: number | null; longitude: number | null
  maxJoiners: number; isTicketed: boolean; ticketPrice: number; currency: string
  pinned: boolean; joiners: EventJoiner[]; createdAt: string; updatedAt: string
}

interface ProjectData {
  id: string; title: string; description: string | null
  goals: string | null; mileposts: string | null; milepostStatus: string | null; resources: string | null
  status: string; published: boolean; schoolId: string | null; shopId: string | null
  category: string | null
  lookingForCollaborators: boolean
  imageUrl: string | null
  images: string | null
  location: string | null
  locationDetails: string | null
  latitude: number | null
  longitude: number | null
  requests: Request[]; isOwner: boolean; isEditor: boolean; events: ProjectEvent[]
  goalAmount: number | null; currentFunding: number | null
  donationAddress: string | null; donationCurrency: string; donationAddresses: string | null
  acceptsDonations: boolean; donationDescription: string | null
  needsVolunteers: boolean; volunteerRoles: string | null; volunteerDescription: string | null
  videoUrl: string | null
  joiners: ProjectJoiner[]; contributions: ProjectContribution[]
  user: { id: string; name: string | null; username: string | null; image?: string | null }
  hashtags?: Array<{ id: string; hashtag: { id: string; tag: string } }>
}

interface Product { id: string; title: string; price: number | null; imageUrl: string | null; type: string }

interface MilepostStatus { id: string; completed: boolean }

interface StatusHistoryEntry { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }

interface ProjectDetailClientProps { project: ProjectData; userId: string; isOwner?: boolean }

type TabKey = 'overview' | 'goals' | 'milestones' | 'resources' | 'support' | 'events'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📋' },
  { key: 'goals', label: 'Goals', icon: '🎯' },
  { key: 'milestones', label: 'Milestones', icon: '🏁' },
  { key: 'resources', label: 'Resources', icon: '📚' },
  { key: 'support', label: 'Support', icon: '💰' },
  { key: 'events', label: 'Events', icon: '📅' },
]

export default function ProjectDetailClient({ project: initialProject, userId, isOwner: propIsOwner }: ProjectDetailClientProps) {
  const [project, setProject] = useState(initialProject)
  const isOwner = propIsOwner ?? project.isOwner
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [projectGoals, setProjectGoals] = useState<ProjectGoal[]>(() => parseGoals(initialProject.goals))
  const [projectMilestones, setProjectMilestones] = useState<ProjectMilestone[]>(() => parseMilestones(initialProject.mileposts, initialProject.milepostStatus))
  const [projectResources, setProjectResources] = useState<ProjectResource[]>(() => parseResources(initialProject.resources))

  const [editedTitle, setEditedTitle] = useState(project.title)
  const [editedDescription, setEditedDescription] = useState(project.description || '')
  const [editedCategory, setEditedCategory] = useState(project.category || '')
  const [editedLocation, setEditedLocation] = useState(project.location || '')
  const [editedLatitude, setEditedLatitude] = useState(project.latitude || null)
  const [editedLongitude, setEditedLongitude] = useState(project.longitude || null)
  const [editedLocationDetails, setEditedLocationDetails] = useState(project.locationDetails || '')
  const [editedLookingForCollaborators, setEditedLookingForCollaborators] = useState(project.lookingForCollaborators)
  const [editedImages, setEditedImages] = useState<string[]>(() => {
    try { const p = project.images ? JSON.parse(project.images) : []; return Array.isArray(p) ? p : [] } catch { return project.imageUrl ? [project.imageUrl] : [] }
  })
  const [projectHashtags, setProjectHashtags] = useState<string[]>(() => {
    if (!Array.isArray(project.hashtags)) return []
    return project.hashtags.map((h: any) => h.hashtag?.tag).filter(Boolean)
  })
  const [editedVideoUrl, setEditedVideoUrl] = useState(project.videoUrl || '')
  const [editedNeedsVolunteers, setEditedNeedsVolunteers] = useState(project.needsVolunteers)
  const [editedVolunteerRoles, setEditedVolunteerRoles] = useState(project.volunteerRoles || '')
  const [editedVolunteerDescription, setEditedVolunteerDescription] = useState(project.volunteerDescription || '')
  const [editedGoalAmount, setEditedGoalAmount] = useState(project.goalAmount?.toString() || '')
  const [editedStatus, setEditedStatus] = useState(project.status)
  const [editedPhases, setEditedPhases] = useState<string[]>(() => {
    try { const p = (project as any).phases ? JSON.parse((project as any).phases) : []; return Array.isArray(p) ? p : [] } catch { return [] }
  })
  const [editingOverview, setEditingOverview] = useState(false)
  const [mapExpanded, setMapExpanded] = useState(false)

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [sharingToFeed, setSharingToFeed] = useState(false)

  const handleShareToFeed = async () => {
    setSharingToFeed(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `Working on: ${project.title}`,
          context: 'PROFILE',
          referenceType: 'PROJECT',
          referenceId: project.id,
          referenceTitle: project.title
        })
      })
      if (res.ok) toastSuccess('Shared to your feed!')
      else toastError('Failed to share')
    } catch { toastError('Failed to share') }
    finally { setSharingToFeed(false) }
  }
  const handleDeleteProject = async () => {
    setDeletingProject(true)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) { toastSuccess('Project deleted'); router.push('/dashboard/projects') }
      else { const d = await res.json(); toastError(d.error || 'Failed to delete') }
    } catch { toastError('Failed to delete') }
    finally { setDeletingProject(false); setDeleteTargetProject(false) }
  }

  const [showCalendar, setShowCalendar] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ProjectEvent | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestDesc, setRequestDesc] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [editDonations, setEditDonations] = useState(false)
  const [editAcceptsDonations, setEditAcceptsDonations] = useState(project.acceptsDonations)
  const [editSelectedDonationAddrs, setEditSelectedDonationAddrs] = useState<DonationAddr[]>(() => hydrateDonationAddresses(project.donationAddress, project.donationCurrency, project.donationAddresses))
  const [editDonationDescription, setEditDonationDescription] = useState(project.donationDescription || '')
  const userDonationAddrs = useDonationAddresses()

  const [eventFormData, setEventFormData] = useState<EventFormData>(() => getDefaultEventFormData())
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([])
  const [showRollbackModal, setShowRollbackModal] = useState(false)
  const [rollbackStatus, setRollbackStatus] = useState('')
  const [rollbackReason, setRollbackReason] = useState('')
  const router = useRouter()
  const { success: toastSuccess, error: toastError } = useToast()
  const [deleteTargetProject, setDeleteTargetProject] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [loadingFollow, setLoadingFollow] = useState(false)

  useEffect(() => {
    if (!userId || !project?.id) return
    fetch(`/api/projects/${project.id}/follow`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setIsFollowing(data.isFollowing)
          setFollowerCount(data.count)
        }
      })
      .catch(() => {})
  }, [userId, project?.id])

  const handleToggleFollow = async () => {
    if (!userId) return
    setLoadingFollow(true)
    try {
      if (isFollowing) {
        await fetch(`/api/projects/${project.id}/follow`, { method: 'DELETE' })
        setIsFollowing(false)
        setFollowerCount(c => Math.max(0, c - 1))
      } else {
        await fetch(`/api/projects/${project.id}/follow`, { method: 'POST' })
        setIsFollowing(true)
        setFollowerCount(c => c + 1)
      }
    } catch {}
    setLoadingFollow(false)
  }

  const openEventModal = (event?: ProjectEvent) => {
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
        projectId: project.id,
        projectTitle: project.title || null,
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
        .then(data => setAvailableProducts((data?.data || []).filter((p: Product) => p.type === 'PRODUCT' || p.type === 'SERVICE')))
        .catch(console.error)
    }
  }, [showRequestModal])

  const saveField = useCallback(async (data: Record<string, unknown>) => {
    setSaveError('')
    const res = await fetch(`/api/projects/${project.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to save')
    }
    return (await res.json())?.data
  }, [project.id])

  const handleSaveOverview = async () => {
    setLoading(true)
    try {
      const updated = await saveField({
        title: editedTitle,
        description: editedDescription || null,
        category: editedCategory || null,
        location: editedLocation || null,
        latitude: editedLatitude ?? null,
        longitude: editedLongitude ?? null,
        locationDetails: editedLocationDetails || null,
        lookingForCollaborators: editedLookingForCollaborators,
        needsVolunteers: editedNeedsVolunteers,
        volunteerRoles: editedVolunteerRoles || null,
        volunteerDescription: editedVolunteerDescription || null,
        goalAmount: editedGoalAmount ? parseFloat(editedGoalAmount) : null,
        videoUrl: editedVideoUrl || null,
        imageUrl: editedImages[0] || null,
        images: editedImages.length > 0 ? JSON.stringify(editedImages) : null,
        phases: editedPhases.length > 0 ? JSON.stringify(editedPhases) : null,
        hashtags: projectHashtags,
      })
      setProject({ ...project, ...updated })
      if (updated?.hashtags) {
        setProjectHashtags(updated.hashtags.map((h: any) => h.hashtag?.tag).filter(Boolean))
      }
      setEditingOverview(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleGoalsChange = async (goals: ProjectGoal[]) => {
    setProjectGoals(goals)
    const updated = await saveField({ goals: stringifyGoals(goals), milepostStatus: stringifyMilestones(projectMilestones) })
    setProject(p => ({ ...p, ...updated, milepostStatus: stringifyMilestones(projectMilestones) }))
  }

  const handleMilestonesChange = async (milestones: ProjectMilestone[]) => {
    setProjectMilestones(milestones)
    const updated = await saveField({ mileposts: stringifyMilestones(milestones) })
    setProject(p => ({ ...p, ...updated }))
  }

  const handleResourcesChange = async (resources: ProjectResource[]) => {
    setProjectResources(resources)
    const updated = await saveField({ resources: stringifyResources(resources) })
    setProject(p => ({ ...p, ...updated }))
  }

  const handlePublish = async () => {
    setLoading(true)
    try {
      const newPublished = !project.published
      const newStatus = project.published ? 'DRAFT' : 'ACTIVE'
      const updated = await saveField({ published: newPublished, status: newStatus })
      setProject({ ...project, ...updated })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string, newPublished?: boolean) => {
    setLoading(true)
    try {
      const updated = await saveField({ status: newStatus, published: newPublished ?? project.published })
      setProject({ ...project, ...updated })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCollab = async () => {
    setLoading(true)
    try {
      const updated = await saveField({ lookingForCollaborators: !project.lookingForCollaborators })
      setProject({ ...project, ...updated })
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
      const url = editingEvent ? `/api/projects/${project.id}/events/${editingEvent.id}` : `/api/projects/${project.id}/events`
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
        const updatedEvent = (await res.json())?.data
        if (editingEvent) {
          setProject(prev => ({ ...prev, events: prev.events.map(ev => ev.id === editingEvent!.id ? { ...ev, ...updatedEvent, createdAt: ev.createdAt, updatedAt: ev.updatedAt } : ev) }))
        } else {
          const now = new Date().toISOString()
          const newEvent: ProjectEvent = {
            id: updatedEvent.id, title: eventFormData.title, description: eventFormData.description || null,
            eventCategory: eventFormData.eventCategory || null, eventDate: eventFormData.eventDate ? new Date(eventFormData.eventDate).toISOString() : null,
            endDate: eventFormData.endDate ? new Date(eventFormData.endDate).toISOString() : null,
            location: eventFormData.location || null, locationDetails: eventFormData.locationDetails || null,
            latitude: null, longitude: null, maxJoiners: eventFormData.maxJoiners || 0,
            isTicketed: eventFormData.isTicketed, ticketPrice: eventFormData.ticketPrice, currency: eventFormData.currency,
            pinned: false, joiners: [], createdAt: now, updatedAt: now
          }
          setProject(prev => ({ ...prev, events: [...prev.events, newEvent] }))
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

  const [deleteEventTarget, setDeleteEventTarget] = useState<string | null>(null)

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/events/${deleteEventTarget}`, { method: 'DELETE' })
      if (res.ok) setProject({ ...project, events: project.events.filter(ev => ev.id !== deleteEventTarget) })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setDeleteEventTarget(null)
    }
  }

  const handleJoinEvent = async (eventId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/events/${eventId}/join`, { method: 'POST' })
      if (res.ok) {
        setProject({ ...project, events: project.events.map(ev => ev.id === eventId ? { ...ev, joiners: [...ev.joiners, { id: '', userId, joinedAt: new Date().toISOString(), user: { id: userId, name: null, email: '' } }] } : ev) })
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
      const res = await fetch(`/api/projects/${project.id}/events/${eventId}/join`, { method: 'DELETE' })
      if (res.ok) setProject({ ...project, events: project.events.map(ev => ev.id === eventId ? { ...ev, joiners: ev.joiners.filter(j => j.userId !== userId) } : ev) })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatusHistory = async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/status-history`)
      if (res.ok) { const d = await res.json(); setStatusHistory(d?.data || d || []) }
    } catch (err) {
      console.error(err)
    }
  }

  const handleRollback = async () => {
    if (!rollbackStatus) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: rollbackStatus, reason: rollbackReason })
      })
      if (res.ok) {
        const updated = (await res.json())?.data
        setProject({ ...project, status: updated.status, published: updated.published })
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
        body: JSON.stringify({ title: requestTitle, description: requestDesc, projectId: project.id, productId: selectedProductId || null })
      })
      if (res.ok) {
        const newRequest = (await res.json())?.data
        const selectedProduct = selectedProductId ? availableProducts.find(p => p.id === selectedProductId) : null
        setProject({ ...project, requests: [{ ...newRequest, user: { name: null, email: '' }, productId: selectedProductId, product: selectedProduct ? { id: selectedProduct.id, title: selectedProduct.title, price: selectedProduct.price, imageUrl: selectedProduct.imageUrl } : null }, ...project.requests] })
        setShowRequestModal(false)
        setRequestTitle(''); setRequestDesc(''); setSelectedProductId('')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const isUserJoinedEvent = (eventId: string) => project.events.find(e => e.id === eventId)?.joiners.some(j => j.userId === userId) || false

  const renderCalendar = () => {
    const events = project.events.filter(e => e.eventDate)
    const months: Record<string, ProjectEvent[]> = {}
    events.forEach(event => {
      if (!event.eventDate) return
      const date = new Date(event.eventDate)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!months[key]) months[key] = []
      months[key].push(event)
    })
    return (
      <div className={styles.calendarView}>
        {Object.keys(months).length === 0 ? <EmptyState icon="📅" title="No events scheduled" description="Add dates to your project events to see them on the calendar." /> : (
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

  const totalGoals = projectGoals.length
  const completedGoals = projectGoals.filter(g => g.status === 'completed').length
  const totalMilestones = projectMilestones.length
  const completedMilestones = projectMilestones.filter(m => m.completed).length
  const totalResources = projectResources.length
  const completedResources = projectResources.filter(r => r.completed).length
  const totalItems = totalGoals + totalMilestones + totalResources
  const completedItems = completedGoals + completedMilestones + completedResources
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className={styles.page}>
        <Link href="/dashboard/projects" className={styles.backLink}>← Back to Projects</Link>
        <ShareBar entityType="PROJECT" title={project.title} description={project.description} variant="compact" />

        <div className={styles.creatorInfo}>
          <Link href={getUserProfileUrl(project.user)} className={styles.creatorLink}>
            {project.user.image ? (
              <Image src={project.user.image} alt="" width={32} height={32} className={styles.creatorAvatar} />
            ) : (
              <span className={styles.creatorAvatarPlaceholder}>{project.user.name?.[0] || 'U'}</span>
            )}
            <span className={styles.creatorName}>{project.user.name || 'Anonymous'}</span>
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
                    <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                    <div className={styles.editActions}>
                      <button onClick={() => setEditingOverview(false)} className="btn-ghost" disabled={loading}>Cancel</button>
                      <button onClick={handleSaveOverview} className="btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                  <input type="text" value={editedTitle} onChange={e => setEditedTitle(e.target.value)} className={styles.titleInput} />
                  <textarea value={editedDescription} onChange={e => setEditedDescription(e.target.value)} className={styles.descInput} rows={3} />
                  <div className={`${styles.formRow} ${styles.formRowGap}`}>
                    <div className={styles.formGroup}>
                      <label>Category</label>
                      <select value={editedCategory} onChange={e => setEditedCategory(e.target.value)} className={styles.formInput}>
                        <option value="">Select...</option>
                        {PROJECT_CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Status</label>
                      <select value={editedStatus} onChange={e => setEditedStatus(e.target.value)} className={styles.formInput}>
                        <option value="IDEA">💡 Idea</option>
                        <option value="ACTIVE">🚀 Active</option>
                        <option value="IN_PROGRESS">🔨 In Progress</option>
                        <option value="COMPLETED">✅ Completed</option>
                      </select>
                    </div>
                  </div>

                  <details className={styles.editSection}>
                    <summary className={styles.editSectionSummary}>📍 Location</summary>
                    <div className={styles.editSectionBody}>
                      <LocationPicker
                        value={{ text: editedLocation, latitude: editedLatitude, longitude: editedLongitude }}
                        onChange={v => { setEditedLocation(v.text); setEditedLatitude(v.latitude); setEditedLongitude(v.longitude) }}
                      />
                      <div className={styles.formGroup}>
                        <label>Location Details</label>
                        <input type="text" value={editedLocationDetails} onChange={e => setEditedLocationDetails(e.target.value)} placeholder="e.g. Meetup point, address" className={styles.formInput} />
                      </div>
                    </div>
                  </details>

                  <details className={styles.editSection}>
                    <summary className={styles.editSectionSummary}>🤝 Collaborate</summary>
                    <div className={styles.editSectionBody}>
                      <label className={styles.collabCheckbox}>
                        <input type="checkbox" checked={editedLookingForCollaborators} onChange={e => setEditedLookingForCollaborators(e.target.checked)} />
                        <span>Looking for collaborators</span>
                      </label>
                      <label className={styles.collabCheckbox}>
                        <input type="checkbox" checked={editedNeedsVolunteers} onChange={e => setEditedNeedsVolunteers(e.target.checked)} />
                        <span>Needs volunteers</span>
                      </label>
                      {editedNeedsVolunteers && (
                        <div className={styles.nestedFields}>
                          <input type="text" value={editedVolunteerRoles} onChange={e => setEditedVolunteerRoles(e.target.value)} placeholder="Roles (comma separated)" className={styles.formInput} />
                          <textarea value={editedVolunteerDescription} onChange={e => setEditedVolunteerDescription(e.target.value)} placeholder="Volunteer description..." className={styles.formInput} rows={2} />
                        </div>
                      )}
                    </div>
                  </details>

                  <details className={styles.editSection}>
                    <summary className={styles.editSectionSummary}>💰 Funding</summary>
                    <div className={styles.editSectionBody}>
                      <div className={styles.formGroup}>
                        <label>Funding Goal ($)</label>
                        <input type="number" value={editedGoalAmount} onChange={e => setEditedGoalAmount(e.target.value)} placeholder="0.00" className={styles.formInput} />
                      </div>
                    </div>
                  </details>

                  <details className={styles.editSection}>
                    <summary className={styles.editSectionSummary}>📸 Media</summary>
                    <div className={styles.editSectionBody}>
                      <div className={styles.formGroup}>
                        <label>Images</label>
                        <ImageUploader images={editedImages} onChange={setEditedImages} maxImages={5} />
                      </div>
                      <div className={styles.formGroup}>
                        <label>Video URL</label>
                        <input type="url" value={editedVideoUrl} onChange={e => setEditedVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={styles.formInput} />
                      </div>
                    </div>
                  </details>

                  <details className={styles.editSection}>
                    <summary className={styles.editSectionSummary}>📋 Planning Stages</summary>
                    <div className={styles.editSectionBody}>
                      {editedPhases.map((p, i) => (
                        <div key={i} className={styles.phaseRow} draggable
                          onDragStart={e => e.dataTransfer.setData('text/plain', String(i))}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            const from = parseInt(e.dataTransfer.getData('text/plain'))
                            const to = i
                            if (from === to) return
                            const next = [...editedPhases]
                            const [moved] = next.splice(from, 1)
                            next.splice(to, 0, moved)
                            setEditedPhases(next)
                          }}
                        >
                          <span className={styles.dragHandle} title="Drag to reorder">⠿</span>
                          <span className={styles.phaseNum}>{i + 1}.</span>
                          <input type="text" value={p} onChange={e => { const n = [...editedPhases]; n[i] = e.target.value; setEditedPhases(n) }} placeholder={`Phase ${i + 1}: Name — Description`} className={styles.formInput} />
                          <button type="button" onClick={() => setEditedPhases(editedPhases.filter((_, idx) => idx !== i))} className={styles.phaseRemoveBtn}>✕</button>
                        </div>
                      ))}
                      <button type="button" onClick={() => setEditedPhases([...editedPhases, ''])} className={styles.phaseAddBtn}>+ Add Phase</button>
                    </div>
                  </details>

                  <div className={styles.formGroup}>
                    <label>Hashtags</label>
                    <HashtagInput value={projectHashtags} onChange={setProjectHashtags} placeholder="Add hashtags..." />
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.overviewHeader}>
                    <div>
                      <div className={styles.titleRow}>
                        <h1>{project.title}</h1>
                        <button onClick={() => navigator.clipboard.writeText(window.location.href)} className={styles.iconBtn} title="Copy link">🔗</button>
                        <button onClick={handleShareToFeed} disabled={sharingToFeed} className={styles.iconBtn} title="Share to Feed">{sharingToFeed ? '⏳' : '📣'}</button>
                        <div className={styles.badges}>
                          {project.published ? <span className="badge badge-published">Published</span> : <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>}
                          {project.lookingForCollaborators && <span className={`badge ${styles.lookingForBadge}`}>🤝 Looking for collaborators</span>}
                        </div>
                      </div>
                      {project.imageUrl && (
                        <div className={styles.projectImageWrap}>
                          <img src={project.imageUrl} alt={project.title} className={styles.projectImage} />
                        </div>
                      )}
                      {project.category && <span className={styles.categoryBadge}>{project.category}</span>}
                      {project.description && <p className={styles.description}>{project.description}</p>}
                      {project.description && <TranslateButton text={project.description} />}
                      {project.hashtags && project.hashtags.length > 0 && (
                        <div className={styles.flexWrap}>
                          {project.hashtags.map((h: any) => (
                            <Link key={h.hashtag?.id || h.id} href={`/hashtag/${h.hashtag?.tag || h.tag}`} className={styles.hashtag}>#{h.hashtag?.tag || h.tag}</Link>
                          ))}
                        </div>
                      )}
                      {(project as any).phases && (() => {
                        let parsed: string[] = []
                        try { parsed = JSON.parse((project as any).phases); if (!Array.isArray(parsed)) parsed = [] } catch {}
                        if (parsed.length === 0) return null
                        return (
                          <div className={styles.phasesSection}>
                            <h4 className={styles.phasesTitle}>📋 Planning Stages</h4>
                            <div className={styles.phasesList}>
                              {parsed.map((p, i) => (
                                <div key={i} className={styles.phaseItem}>
                                  <span className={styles.phaseNum}>{i + 1}.</span>
                                  <span>{p}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                      {userId && !isOwner && (
                        <div className={styles.my12}>
                          <CollaborateButton entityType="PROJECT" entityId={project.id} label="🤝 Join as Collaborator" variant="secondary" />
                        </div>
                      )}
                      {userId && (
                        <div className={styles.followRow}>
                          <button
                            type="button"
                            onClick={handleToggleFollow}
                            disabled={loadingFollow}
                            className={isFollowing ? styles.followBtnActive : styles.followBtn}
                          >
                            {isFollowing ? '🔔 Following' : '🔔 Follow'}
                          </button>
                          {followerCount > 0 && (
                            <span className={styles.followerCount}>{followerCount} {followerCount === 1 ? 'follower' : 'followers'}</span>
                          )}
                        </div>
                      )}
                      {userId && (
                        <div className={styles.my12}>
                          <PinToBoardButton
                            entityType="PROJECT"
                            entityId={project.id}
                            entityTitle={project.title}
                            entityImage={project.imageUrl || undefined}
                            entityLatitude={project.latitude || undefined}
                            entityLongitude={project.longitude || undefined}
                            variant="ghost"
                              label="Pin to Board"
                          />
                        </div>
                      )}
                      <EntityActions
                        entityType="PROJECT"
                        entityId={project.id}
                        title={project.title}
                        authorId={project.user.id}
                        image={project.imageUrl}
                        variant="bar"
                      />

                      {(project.location || (project.latitude && project.longitude)) && (
                        <div className={styles.locationSection}>
                          <div className={styles.locationHeader}>
                            <h4 className={styles.locationTitle}>📍 Location</h4>
                            <button type="button" onClick={() => setMapExpanded(!mapExpanded)} className={styles.mapExpandBtn}>
                              {mapExpanded ? '− Collapse' : '⛶ Expand'}
                            </button>
                          </div>
                          {project.location && <p className={styles.locationText}>{project.location}</p>}
                          {project.latitude && project.longitude && (
                            <div className={`${styles.locationMapWrap} ${mapExpanded ? styles.locationMapExpanded : ''}`}>
                              <ProjectMapContainer center={[project.latitude, project.longitude]} zoom={mapExpanded ? 15 : 13} className={styles.locationMap} scrollWheelZoom={mapExpanded}>
                                <ProjectTileLayer
                                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <ProjectMarker position={[project.latitude, project.longitude]}>
                                  <ProjectPopup>{project.location || project.title}</ProjectPopup>
                                </ProjectMarker>
                              </ProjectMapContainer>
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
                      <div className={`${styles.flexRow} ${styles.gap16}`}>
                        <svg width="48" height="48" viewBox="0 0 36 36">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent-success)" strokeWidth="3" strokeDasharray={`${overallProgress}, 100`} />
                        </svg>
                        <div className={styles.flex1}>
                          <div className={styles.progressTrack}>
                            <div className={styles.progressFill} style={{ width: `${overallProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className={styles.statsRow}>
                    <div className={`${styles.statChip} ${styles.statChipClickable}`} onClick={() => setActiveTab('goals')}>
                      <span className={styles.statChipIcon}>🎯</span>
                      <span>{completedGoals}/{totalGoals} Goals</span>
                    </div>
                    <div className={`${styles.statChip} ${styles.statChipClickable}`} onClick={() => setActiveTab('milestones')}>
                      <span className={styles.statChipIcon}>🏁</span>
                      <span>{completedMilestones}/{totalMilestones} Milestones</span>
                    </div>
                    <div className={`${styles.statChip} ${styles.statChipClickable}`} onClick={() => setActiveTab('resources')}>
                      <span className={styles.statChipIcon}>📚</span>
                      <span>{completedResources}/{totalResources} Resources</span>
                    </div>
                    <div className={styles.statChip}>
                      <span className={styles.statChipIcon}>📅</span>
                      <span>{project.events.length} Events</span>
                    </div>
                    <div className={`${styles.statChip} ${styles.statChipClickable}`} onClick={() => document.getElementById('project-requests-section')?.scrollIntoView({ behavior: 'smooth' })}>
                      <span className={styles.statChipIcon}>📝</span>
                      <span>{project.requests.length} Requests</span>
                    </div>
                    {project.goalAmount && project.goalAmount > 0 && (
                      <div className={styles.statChip}>
                        <span className={styles.statChipIcon}>💰</span>
                        <span>${project.currentFunding || 0} / ${project.goalAmount}</span>
                      </div>
                    )}
                    {project.needsVolunteers && (
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
                      <button onClick={handlePublish} className={project.published ? 'btn-secondary' : 'btn-primary'} disabled={loading}>
                        {project.published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={handleToggleCollab} className={project.lookingForCollaborators ? 'btn-secondary' : 'btn-primary'} disabled={loading}>
                        {project.lookingForCollaborators ? '🤝 Open to Collab' : '🤝 Looking for Collaborators'}
                      </button>
                      {project.status !== 'COMPLETED' && (
                        <button onClick={() => handleStatusChange('COMPLETED', false)} className="btn-secondary" disabled={loading}>Mark Complete</button>
                      )}
                      {project.status !== 'ARCHIVED' && (
                        <button onClick={() => handleStatusChange('ARCHIVED', false)} className="btn-ghost" disabled={loading}>Archive</button>
                      )}
                      <button onClick={() => setDeleteTargetProject(true)} className={styles.deleteBtnProject}>Delete Project</button>
                      <button onClick={() => { setShowStatusHistory(true); fetchStatusHistory(); }} className={styles.historyBtn}>Status History</button>
                    </div>
                  )}

                  {/* Project Updates - Community Timeline */}
                  <div className={styles.mt32}>
                    <ProjectUpdates projectId={project.id} isOwner={isOwner} isEditor={project.isEditor} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Goals Tab */}
          {activeTab === 'goals' && (
            <div className={styles.tabPanel}>
              <ProjectGoals goals={projectGoals} isOwner={isOwner} onChange={handleGoalsChange} />
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && (
            <div className={styles.tabPanel}>
              <ProjectMilestones milestones={projectMilestones} isOwner={isOwner} onChange={handleMilestonesChange} />
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div className={styles.tabPanel}>
              <ProjectResources resources={projectResources} isOwner={isOwner} onChange={handleResourcesChange} />
            </div>
          )}

          {/* Support Tab */}
          {activeTab === 'support' && (
            <div className={styles.tabPanel}>
              {isOwner && (
                <div className={styles.mb16}>
                  <div className={styles.donationHeader}>
                    <h3 className={styles.donationTitle}>Donation Settings</h3>
                    <button
                      onClick={() => {
                        if (editDonations) {
                          setEditAcceptsDonations(project.acceptsDonations)
                          setEditSelectedDonationAddrs(hydrateDonationAddresses(project.donationAddress, project.donationCurrency, project.donationAddresses))
                          setEditDonationDescription(project.donationDescription || '')
                        }
                        setEditDonations(!editDonations)
                      }}
                      className={`btn-ghost ${styles.small}`}
                    >
                      {editDonations ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {editDonations ? (
                    <>
                      <label className={styles.donationCheckbox}>
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
                           <div className={styles.field}>
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
                            setProject({ ...project, ...updated })
                            setEditDonations(false)
                          } catch (err) {
                            setSaveError(err instanceof Error ? err.message : 'Failed to update donation settings')
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className={`btn-primary ${styles.mt8}`}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Donation Settings'}
                      </button>
                    </>
                  ) : (
                    <p className={styles.mutedSmall}>
                      {project.acceptsDonations ? 'This project accepts donations.' : 'Donations are not enabled for this project.'}
                      {project.donationAddress && ` Address: ${project.donationAddress.slice(0, 6)}...${project.donationAddress.slice(-4)}`}
                    </p>
                  )}
                </div>
              )}
              <ProjectSupport
                projectId={project.id}
                currentFunding={project.currentFunding}
                goalAmount={project.goalAmount}
                donationAddress={project.donationAddress}
                donationCurrency={project.donationCurrency}
donationDescription={project.donationDescription}
                 donationAddresses={project.donationAddresses}
                 acceptsDonations={project.acceptsDonations}
                needsVolunteers={project.needsVolunteers}
                volunteerRoles={project.volunteerRoles}
                volunteerDescription={project.volunteerDescription}
                joiners={project.joiners}
                contributions={project.contributions}
                userId={userId}
                isOwner={isOwner}
              />
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className={styles.tabPanel}>
              <div className={styles.eventsHeader}>
                <h2>Events ({project.events.length})</h2>
                <div className={styles.eventActions}>
                  <button onClick={() => setShowCalendar(!showCalendar)} className={styles.calendarBtn}>
                    {showCalendar ? 'List View' : '📅 Calendar'}
                  </button>
                  {isOwner && <button onClick={() => openEventModal()} className={styles.createBtn}>+ Add Event</button>}
                </div>
              </div>

              {showCalendar ? renderCalendar() : project.events.length === 0 ? (
                <EmptyState icon="📅" title="No events scheduled yet" description="Add events to your project timeline." action={isOwner ? { label: 'Add Event', onClick: () => openEventModal() } : undefined} />
              ) : (
                <div className={styles.eventsList}>
                  {project.events.map(event => (
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
                          <button onClick={() => setDeleteEventTarget(event.id)} className={styles.deleteBtn}>Delete</button>
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
        <div id="project-requests-section" className={styles.requestsSection}>
          <div className={styles.requestsHeader}>
            <h2>Requests ({project.requests.length})</h2>
            <button onClick={() => setShowRequestModal(true)} className={styles.createBtn}>+ New</button>
          </div>
          {project.requests.length === 0 ? (
            <EmptyState icon="📝" title="No requests yet" description="Create a request to get what you need for this project." action={isOwner ? { label: 'New Request', onClick: () => setShowRequestModal(true) } : undefined} />
          ) : (
            <div className={styles.requestList}>
              {project.requests.map(req => (
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
        entityType="PROJECT"
        entityId={project.id}
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
              fixedProjectId={project.id}
              fixedProjectTitle={project.title || undefined}
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
          <div className={`modal ${styles.modalInner}`} onClick={e => e.stopPropagation()}>
            <div className={`${styles.flexBetween} ${styles.modalSection}`}>
              <h2>Status History</h2>
              <button onClick={() => setShowStatusHistory(false)} className="btn-ghost">×</button>
            </div>
            <div className={styles.statusScroll}>
              {statusHistory.length === 0 ? (
                <EmptyState icon="📜" title="No status changes yet" description="Status history will appear as the project progresses." />
              ) : (
                <div className={styles.statusList}>
                  <div className={styles.statusCurrent}>
                    <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
                    <span className={styles.statusCurrentLabel}>Current Status</span>
                  </div>
                  {statusHistory.map(entry => (
                    <div key={entry.id} className={styles.historyEntry}>
                      <div className={styles.historyEntryHeader}>
                        <div className={styles.historyBadges}>
                          {entry.fromStatus && <span className={styles.mutedSmall}>{entry.fromStatus} →</span>}
                          <span className={`badge badge-${entry.toStatus.toLowerCase()}`}>{entry.toStatus}</span>
                        </div>
                        <span className={styles.historyTimestamp}>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                      {entry.reason && <p className={styles.historyReason}>{entry.reason}</p>}
                      {project.status !== entry.toStatus && isOwner && (
                        <button onClick={() => { setShowStatusHistory(false); setRollbackStatus(entry.toStatus); setShowRollbackModal(true); }} className={`btn-ghost ${styles.historyRollbackBtn}`}>Rollback</button>
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
            <p className={styles.confirmText}>
              Change status from <strong>{project.status}</strong> to <strong>{rollbackStatus}</strong>?
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



      <ConfirmDialog
        isOpen={!!deleteEventTarget}
        onClose={() => setDeleteEventTarget(null)}
        onConfirm={handleDeleteEvent}
        title="Delete Event"
        message="Delete this project event?"
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={deleteTargetProject}
        onClose={() => setDeleteTargetProject(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        message="Delete this entire project and all its data? This cannot be undone."
        confirmLabel={deletingProject ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
      </div>
  )
}
