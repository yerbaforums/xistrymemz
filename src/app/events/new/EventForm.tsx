'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'

const CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'WEDDING', label: 'Wedding' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'BIRTHDAY', label: 'Birthday' },
  { value: 'MEETUP', label: 'Meetup' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'CONCERT', label: 'Concert' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'SHOP', label: 'Shop Event' },
  { value: 'OTHER', label: 'Other' }
]

export function EventForm() {
  const router = useRouter()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventCategory: 'GENERAL',
    eventDate: '',
    endDate: '',
    location: '',
    locationDetails: '',
    maxJoiners: 0,
    isTicketed: false,
    ticketPrice: 0,
    currency: 'USD',
    visibility: 'PUBLIC',
    eventType: 'public'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      error('Title is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxJoiners: formData.maxJoiners ? parseInt(String(formData.maxJoiners)) : 0,
          ticketPrice: formData.ticketPrice ? parseFloat(String(formData.ticketPrice)) : 0
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
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.eventTypeToggle}>
        <button
          type="button"
          className={`${styles.typeBtn} ${formData.eventType === 'personal' ? styles.active : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, eventType: 'personal', visibility: 'PRIVATE' }))}
        >
          Personal
        </button>
        <button
          type="button"
          className={`${styles.typeBtn} ${formData.eventType === 'public' ? styles.active : ''}`}
          onClick={() => setFormData(prev => ({ ...prev, eventType: 'public', visibility: 'PUBLIC' }))}
        >
          Public Event
        </button>
      </div>

      <div className={styles.field}>
        <label htmlFor="title">Title *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Event title"
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe your event..."
          rows={4}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="eventCategory">Category</label>
          <select id="eventCategory" name="eventCategory" value={formData.eventCategory} onChange={handleChange}>
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="maxJoiners">Max Attendees (0 = unlimited)</label>
          <input
            type="number"
            id="maxJoiners"
            name="maxJoiners"
            value={formData.maxJoiners}
            onChange={handleChange}
            min={0}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="eventDate">Start Date/Time</label>
          <input
            type="datetime-local"
            id="eventDate"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="endDate">End Date/Time</label>
          <input
            type="datetime-local"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="location">Location</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="City, address, or venue name"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="locationDetails">Location Details</label>
        <input
          type="text"
          id="locationDetails"
          name="locationDetails"
          value={formData.locationDetails}
          onChange={handleChange}
          placeholder="Additional details (room, floor, etc.)"
        />
      </div>

      <div className={styles.ticketing}>
        <div className={styles.checkboxField}>
          <input
            type="checkbox"
            id="isTicketed"
            name="isTicketed"
            checked={formData.isTicketed}
            onChange={handleChange}
          />
          <label htmlFor="isTicketed">Ticketed Event</label>
        </div>

        {formData.isTicketed && (
          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="ticketPrice">Ticket Price</label>
              <input
                type="number"
                id="ticketPrice"
                name="ticketPrice"
                value={formData.ticketPrice}
                onChange={handleChange}
                min={0}
                step={0.01}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="currency">Currency</label>
              <select id="currency" name="currency" value={formData.currency} onChange={handleChange}>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="XMR">XMR</option>
                <option value="XTM">XTM</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  )
}