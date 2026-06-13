'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import EventFormFields, { getDefaultEventFormData } from '@/components/EventFormFields'
import { serializeDonationAddresses, donationAddressesToLegacy } from '@/lib/donations'
import { getEventTemplateById } from '@/lib/event-templates'
import type { EventFormData } from '@/components/EventFormFields'

export function EventForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EventFormData>(() => getDefaultEventFormData())

  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      const template = getEventTemplateById(templateId)
      if (template) {
        setFormData(prev => ({
          ...prev,
          title: template.name,
          description: template.suggestedDescription,
          eventCategory: template.category,
          maxJoiners: template.suggestedMaxJoiners,
          location: template.suggestedLocation || prev.location,
          needsVolunteers: template.suggestedVolunteerRoles.length > 0,
          volunteerRoles: JSON.stringify(template.suggestedVolunteerRoles),
          volunteerDescription: `Volunteer roles available: ${template.suggestedVolunteerRoles.join(', ')}`
        }))
      }
    }
  }, [searchParams])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      error('Title is required')
      return
    }

    setLoading(true)
    try {
      let volunteerRoles = formData.volunteerRoles
      if (formData.needsVolunteers && volunteerRoles) {
        try { JSON.parse(volunteerRoles) } catch {
          volunteerRoles = JSON.stringify(volunteerRoles.split(',').map(r => r.trim()).filter(Boolean))
        }
      }

      const legacy = donationAddressesToLegacy(formData.acceptsDonations ? formData.selectedDonationAddrs : [])
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          imageUrl: formData.images[0] || null,
          eventCategory: formData.eventCategory,
          eventDate: formData.eventDate || undefined,
          endDate: formData.endDate || undefined,
          location: formData.location,
          locationDetails: formData.locationDetails,
          maxJoiners: formData.maxJoiners,
          isTicketed: formData.isTicketed,
          ticketPrice: formData.ticketPrice,
          currency: formData.currency,
          visibility: formData.visibility,
          eventType: formData.eventType,
          projectId: formData.projectId,
          groupId: formData.groupId,
          acceptsDonations: formData.acceptsDonations,
          ...legacy,
          donationAddresses: formData.acceptsDonations ? serializeDonationAddresses(formData.selectedDonationAddrs) : null,
          needsVolunteers: formData.needsVolunteers,
          volunteerRoles,
          volunteerDescription: formData.volunteerDescription,
          hashtags: formData.hashtags
        })
      })

      if (res.ok) {
        const event = await res.json()
        success('Event created successfully!')
        router.push(`/events/${event.id}`)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to create event')
      }
    } catch (err) {
      console.error(err)
      error('Failed to create event')
    } finally {
      setLoading(false)
    }
  }, [formData, success, error, router])

  return (
    <div>
      <EventFormFields
        formData={formData}
        onChange={(patch) => setFormData(prev => ({ ...prev, ...patch }))}
        onSubmit={handleSubmit}
        mode="create"
        saving={loading}
        onCancel={() => router.back()}
      />

      {searchParams.get('template') && (
        <div className={styles.templateNotice}>
          <span>📋 Template applied — fields pre-filled</span>
          <button type="button" onClick={() => {
            router.replace('/events/new')
            setFormData(getDefaultEventFormData())
          }}>
            Clear Template
          </button>
        </div>
      )}
    </div>
  )
}