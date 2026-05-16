'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import { getEventTemplateById } from '@/lib/event-templates'
import type { DonationAddr } from '@/types/product'

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
  { value: 'OUTDOOR', label: 'Outdoor' },
  { value: 'RETREAT', label: 'Retreat' },
  { value: 'CEREMONY', label: 'Ceremony' },
  { value: 'WELLNESS', label: 'Wellness' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'OTHER', label: 'Other' }
]

export function EventForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { success, error } = useToast()
  const [loading, setLoading] = useState(false)
  const [userDonationAddrs, setUserDonationAddrs] = useState<DonationAddr[]>([])
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
    eventType: 'public',
    needsVolunteers: false,
    volunteerRoles: '',
    volunteerDescription: '',
    acceptsDonations: false,
    donationAddress: '',
    donationCurrency: 'ETH',
    hashtags: [] as string[]
  })

  useEffect(() => {
    fetch('/api/user/donation-addresses')
      .then(res => res.ok ? res.json() : [])
      .then(data => setUserDonationAddrs(data || []))
      .catch(() => {})
  }, [])

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

  const [hashtagInput, setHashtagInput] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleAddHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !formData.hashtags.includes(tag)) {
      setFormData(prev => ({ ...prev, hashtags: [...prev.hashtags, tag] }))
    }
    setHashtagInput('')
  }

  const handleRemoveHashtag = (tag: string) => {
    setFormData(prev => ({ ...prev, hashtags: prev.hashtags.filter(t => t !== tag) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
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

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          volunteerRoles,
          maxJoiners: formData.maxJoiners ? parseInt(String(formData.maxJoiners)) : 0,
          ticketPrice: formData.ticketPrice ? parseFloat(String(formData.ticketPrice)) : 0,
          acceptsDonations: formData.acceptsDonations,
          donationAddress: formData.acceptsDonations ? (formData.donationAddress || null) : null,
          donationCurrency: formData.acceptsDonations ? (formData.donationCurrency || 'ETH') : null,
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

      <div className={styles.volunteering}>
        <div className={styles.checkboxField}>
          <input
            type="checkbox"
            id="needsVolunteers"
            name="needsVolunteers"
            checked={formData.needsVolunteers}
            onChange={handleChange}
          />
          <label htmlFor="needsVolunteers">Recruit Volunteers</label>
        </div>

        {formData.needsVolunteers && (
          <>
            <div className={styles.field}>
              <label htmlFor="volunteerRoles">Volunteer Roles (comma separated)</label>
              <input
                type="text"
                id="volunteerRoles"
                name="volunteerRoles"
                value={formData.volunteerRoles}
                onChange={handleChange}
                placeholder="e.g., Setup, Cleanup, Photography"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="volunteerDescription">Volunteer Description</label>
              <textarea
                id="volunteerDescription"
                name="volunteerDescription"
                value={formData.volunteerDescription}
                onChange={handleChange}
                placeholder="Describe what volunteers will do..."
                rows={2}
              />
            </div>
          </>
        )}
      </div>

      <div className={styles.field}>
        <label>Hashtags</label>
        <div className={styles.hashtagInputRow}>
          <input
            type="text"
            value={hashtagInput}
            onChange={e => setHashtagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddHashtag()
              }
            }}
            placeholder="Type a hashtag and press Enter"
          />
          <button type="button" onClick={handleAddHashtag} className={styles.addHashtagBtn}>Add</button>
        </div>
        {formData.hashtags.length > 0 && (
          <div className={styles.hashtagList}>
            {formData.hashtags.map(tag => (
              <span key={tag} className={styles.hashtagChip}>
                #{tag}
                <button type="button" onClick={() => handleRemoveHashtag(tag)} className={styles.removeHashtagBtn}>&times;</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <details className={styles.eventSettings}>
        <summary className={styles.settingsSummary}>Event Settings</summary>
        <div className={styles.settingsBody}>
          <div className={styles.checkboxField}>
            <input
              type="checkbox"
              id="acceptsDonations"
              name="acceptsDonations"
              checked={formData.acceptsDonations}
              onChange={handleChange}
            />
            <label htmlFor="acceptsDonations">Accept Donations</label>
          </div>

          {formData.acceptsDonations && (
            <div className={styles.donationFields}>
              <div className="form-group">
                <label>Donation Address</label>
                {userDonationAddrs.length === 0 ? (
                  <p className={styles.noAddrs}>
                    No donation addresses saved.{' '}
                    <a href="/profile/edit" style={{ color: 'var(--accent-primary)' }}>Add one in your profile settings</a>
                  </p>
                ) : (
                  <div className={styles.chipGroup}>
                    {userDonationAddrs.map(da => {
                      const selected = formData.donationAddress === da.address && formData.donationCurrency === da.currency
                      const shortAddr = da.address.length > 12 ? da.address.slice(0, 4) + '...' + da.address.slice(-4) : da.address
                      return (
                        <button
                          key={da.id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, donationAddress: da.address, donationCurrency: da.currency }))
                          }}
                          className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
                          title={`${da.label || da.currency}: ${da.address}`}
                        >
                          <span className={styles.chipCurrency}>{da.currency}</span>
                          <span>{shortAddr}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {userDonationAddrs.length === 0 && (
                <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Currency</label>
                    <select value={formData.donationCurrency} onChange={e => setFormData(prev => ({ ...prev, donationCurrency: e.target.value }))}>
                      <option value="ETH">ETH (Ethereum)</option>
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="USDT">USDT (Tether)</option>
                      <option value="USDC">USDC (USD Coin)</option>
                      <option value="XMR">XMR (Monero)</option>
                      <option value="XTM">XTM (Tari)</option>
                      <option value="ARRR">ARRR (Pirate)</option>
                      <option value="DERO">DERO (Dero)</option>
                      <option value="ZANO">ZANO (Zano)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      {searchParams.get('template') && (
        <div className={styles.templateNotice}>
          <span>📋 Template applied — fields pre-filled from &quot;{getEventTemplateById(searchParams.get('template') || '')?.name || 'template'}&quot;</span>
          <button type="button" onClick={() => {
            router.replace('/events/new')
            setFormData({
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
              eventType: 'public',
              needsVolunteers: false,
              volunteerRoles: '',
              volunteerDescription: '',
              acceptsDonations: false,
              donationAddress: '',
              donationCurrency: 'ETH',
              hashtags: []
            })
          }}>
            Clear Template
          </button>
        </div>
      )}

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