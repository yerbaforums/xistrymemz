'use client'

import { useState } from 'react'
import ImageUploader from '@/components/ImageUploader'
import HashtagInput from '@/components/HashtagInput'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import AssetPicker from '@/components/AssetPicker'
import LocationOption from '@/components/LocationOption'
import { EVENT_CATEGORIES } from '@/lib/event-categories'
import { useDonationAddresses } from '@/hooks/useDonationAddresses'
import styles from './EventFormFields.module.css'
import type { DonationAddr } from '@/types/product'
import type { UserAsset } from '@/components/AssetPicker'

export interface EventFormData {
  title: string
  description: string
  imageUrl: string
  images: string[]
  eventCategory: string
  eventDate: string
  endDate: string
  location: string
  locationDetails: string
  latitude: number | null
  longitude: number | null
  locationMode: 'passport' | 'custom' | 'global'
  maxJoiners: number
  isTicketed: boolean
  ticketPrice: number
  currency: string
  visibility: string
  eventType: string
  isPrivate?: boolean
  needsVolunteers: boolean
  volunteerRoles: string
  volunteerDescription: string
  acceptsDonations: boolean
  selectedDonationAddrs: DonationAddr[]
  isVirtual: boolean
  meetingLink: string
  videoRoomId: string | null
  hashtags: string[]
  projectId: string | null
  projectTitle: string | null
  groupId: string | null
  groupTitle: string | null
  schoolId: string | null
  shopId: string | null
}

const DEFAULT_FORM_DATA: EventFormData = {
  title: '',
  description: '',
  imageUrl: '',
  images: [],
  eventCategory: 'GENERAL',
  eventDate: '',
  endDate: '',
  location: '',
  locationDetails: '',
  latitude: null,
  longitude: null,
  locationMode: 'custom' as const,
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
  selectedDonationAddrs: [],
  isVirtual: false,
  meetingLink: '',
  videoRoomId: null,
  hashtags: [],
  projectId: null,
  projectTitle: null,
  groupId: null,
  groupTitle: null,
  schoolId: null,
  shopId: null,
}

interface EventFormFieldsProps {
  formData: EventFormData
  onChange: (data: Partial<EventFormData>) => void
  onSubmit: (e: React.FormEvent) => void
  mode: 'create' | 'edit'
  fixedProjectId?: string
  fixedProjectTitle?: string
  saving?: boolean
  onCancel?: () => void
  submitLabel?: string
  compact?: boolean
}

export type { UserAsset }

export function getDefaultEventFormData(): EventFormData {
  return { ...DEFAULT_FORM_DATA }
}

export default function EventFormFields({
  formData,
  onChange,
  onSubmit,
  mode,
  fixedProjectId,
  fixedProjectTitle,
  saving,
  onCancel,
  submitLabel,
  compact,
}: EventFormFieldsProps) {
  const userDonationAddrs = useDonationAddresses()

  const set = (patch: Partial<EventFormData>) => onChange(patch)
  const [meetingLinkType, setMeetingLinkType] = useState<'platform' | 'custom' | 'none'>(
    formData.meetingLink?.includes('/dashboard/video?invite=') ? 'platform' : formData.meetingLink ? 'custom' : 'none'
  )
  const [creatingRoom, setCreatingRoom] = useState(false)

  const handleCreatePlatformRoom = async () => {
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${formData.title || 'Event'} Video Room` }),
      })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      const room = data?.data?.room || data?.room
      if (room) {
        const link = `${window.location.origin}/dashboard/video?invite=${room.inviteCode}`
        set({ meetingLink: link, videoRoomId: room.id })
      }
    } catch {
      // silently fail, user can try again or use custom link
    } finally {
      setCreatingRoom(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      set({ [name]: (e.target as HTMLInputElement).checked })
    } else {
      set({ [name]: value })
    }
  }

  const handleLinkedAsset = (asset: UserAsset | null) => {
    set({
      projectId: null,
      projectTitle: null,
      groupId: null,
      groupTitle: null,
      schoolId: null,
      shopId: null,
      ...(asset?.type === 'PROJECT' ? { projectId: asset.id, projectTitle: asset.title } : {}),
      ...(asset?.type === 'GROUP' ? { groupId: asset.id, groupTitle: asset.title } : {}),
      ...(asset?.type === 'SCHOOL' ? { schoolId: asset.id } : {}),
      ...(asset?.type === 'SHOP' ? { shopId: asset.id } : {}),
    })
  }

  const selectedLinkedAsset: UserAsset | null = (() => {
    if (fixedProjectId) return { id: fixedProjectId, type: 'PROJECT', title: fixedProjectTitle || 'This Project', image: null, location: null, latitude: null, longitude: null }
    if (formData.projectId) return { id: formData.projectId, type: 'PROJECT', title: formData.projectTitle || 'Project', image: null, location: null, latitude: null, longitude: null }
    if (formData.groupId) return { id: formData.groupId, type: 'GROUP', title: formData.groupTitle || 'Group', image: null, location: null, latitude: null, longitude: null }
    if (formData.schoolId) return { id: formData.schoolId, type: 'SCHOOL', title: 'My School', image: null, location: null, latitude: null, longitude: null }
    if (formData.shopId) return { id: formData.shopId, type: 'SHOP', title: 'My Shop', image: null, location: null, latitude: null, longitude: null }
    return null
  })()

  return (
    <form onSubmit={onSubmit} className={styles.form}>
      {mode === 'create' && !compact && (
        <div className={styles.eventTypeToggle}>
          <button
            type="button"
            className={`${styles.typeBtn} ${formData.eventType === 'personal' ? styles.active : ''}`}
            onClick={() => set({ eventType: 'personal', visibility: 'PRIVATE' })}
          >
            Personal
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${formData.eventType === 'public' ? styles.active : ''}`}
            onClick={() => set({ eventType: 'public', visibility: 'PUBLIC' })}
          >
            Public Event
          </button>
        </div>
      )}
      {formData.eventType === 'public' && (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={formData.isPrivate || false} onChange={e => set({ isPrivate: e.target.checked })} />
          Private event — only invited users can join
        </label>
      )}

      <div className={styles.field}>
        <label htmlFor="ef-title">Title *</label>
        <input
          type="text" id="ef-title" name="title"
          value={formData.title} onChange={handleChange}
          placeholder="Event title" required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="ef-desc">Description</label>
        <textarea
          id="ef-desc" name="description"
          value={formData.description} onChange={handleChange}
          placeholder="Describe your event..." rows={4}
        />
      </div>

      {!compact && (
        <div className={styles.field}>
          <label>Event Image</label>
          <ImageUploader
            images={formData.images}
            onChange={(urls) => set({ images: urls, imageUrl: urls[0] || '' })}
            maxImages={1}
          />
        </div>
      )}

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-category">Category</label>
          <select id="ef-category" name="eventCategory" value={formData.eventCategory} onChange={handleChange}>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-maxJoiners">Max Attendees (0 = unlimited)</label>
          <input type="number" id="ef-maxJoiners" name="maxJoiners" value={formData.maxJoiners} onChange={handleChange} min={0} />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor="ef-eventDate">Start Date/Time</label>
          <input type="datetime-local" id="ef-eventDate" name="eventDate" value={formData.eventDate} onChange={handleChange} />
        </div>
        <div className={styles.field}>
          <label htmlFor="ef-endDate">End Date/Time</label>
          <input type="datetime-local" id="ef-endDate" name="endDate" value={formData.endDate} onChange={handleChange} />
        </div>
      </div>

      <div className={styles.checkboxField}>
        <input type="checkbox" id="ef-virtual" name="isVirtual" checked={formData.isVirtual} onChange={handleChange} />
        <label htmlFor="ef-virtual">Virtual Event</label>
      </div>

      {formData.isVirtual ? (
        <div className={styles.virtualSection}>
          <label className={styles.virtualSectionLabel}>Meeting Link</label>
          <div className={styles.meetingOptions}>
            <label className={`${styles.meetingOption} ${meetingLinkType === 'platform' ? styles.meetingOptionSelected : ''}`}>
              <input type="radio" name="meetingLinkType" checked={meetingLinkType === 'platform'} onChange={() => setMeetingLinkType('platform')} />
              <div>
                <div className={styles.meetingOptionTitle}>Platform Video Room</div>
                <div className={styles.meetingOptionDesc}>
                  Create a video room on this platform. A link will be generated automatically.
                </div>
                {meetingLinkType === 'platform' && formData.meetingLink && (
                  <code className={styles.meetingLinkPreview}>{formData.meetingLink}</code>
                )}
                {meetingLinkType === 'platform' && !formData.meetingLink && (
                  <button type="button" onClick={handleCreatePlatformRoom} disabled={creatingRoom} className={styles.createRoomBtn}>
                    {creatingRoom ? 'Creating...' : 'Create Video Room'}
                  </button>
                )}
              </div>
            </label>

            <label className={`${styles.meetingOption} ${meetingLinkType === 'custom' ? styles.meetingOptionSelected : ''}`}>
              <input type="radio" name="meetingLinkType" checked={meetingLinkType === 'custom'} onChange={() => setMeetingLinkType('custom')} />
              <div>
                <div className={styles.meetingOptionTitle}>Custom meeting link</div>
                <div className={styles.meetingOptionDesc}>
                  Use Zoom, Google Meet, or any other video service.
                </div>
                {meetingLinkType === 'custom' && (
                  <input
                    type="url"
                    name="meetingLink"
                    value={formData.meetingLink}
                    onChange={(e) => set({ meetingLink: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className={styles.meetingLinkInput}
                  />
                )}
              </div>
            </label>

            <label className={`${styles.meetingOption} ${meetingLinkType === 'none' ? styles.meetingOptionSelected : ''}`}>
              <input type="radio" name="meetingLinkType" checked={meetingLinkType === 'none'}               onChange={() => { setMeetingLinkType('none'); set({ meetingLink: '', videoRoomId: null }) }} />
              <div>
                <div className={styles.meetingOptionTitle}>No meeting link</div>
                <div className={styles.meetingOptionDesc}>
                  Virtual event without a video call.
                </div>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.field}>
            <LocationOption
              value={{ mode: formData.locationMode, text: formData.location, latitude: formData.latitude, longitude: formData.longitude }}
              onChange={v => set({ location: v.text, latitude: v.latitude, longitude: v.longitude, locationMode: v.mode })}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="ef-locationDetails">Location Details</label>
            <input type="text" id="ef-locationDetails" name="locationDetails" value={formData.locationDetails} onChange={handleChange} placeholder="Room, floor, link, etc." />
          </div>
        </>
      )}

      <div className={styles.checkboxField}>
        <input type="checkbox" id="ef-ticketed" name="isTicketed" checked={formData.isTicketed} onChange={handleChange} />
        <label htmlFor="ef-ticketed">Ticketed Event</label>
      </div>

      {formData.isTicketed && (
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="ef-ticketPrice">Ticket Price</label>
            <input type="number" id="ef-ticketPrice" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} min={0} step={0.01} />
          </div>
          <div className={styles.field}>
            <label htmlFor="ef-currency">Currency</label>
            <select id="ef-currency" name="currency" value={formData.currency} onChange={handleChange}>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="XMR">XMR</option>
              <option value="XTM">XTM</option>
            </select>
          </div>
        </div>
      )}

      <div className={styles.checkboxField}>
        <input type="checkbox" id="ef-volunteers" name="needsVolunteers" checked={formData.needsVolunteers} onChange={handleChange} />
        <label htmlFor="ef-volunteers">Recruit Volunteers</label>
      </div>

      {formData.needsVolunteers && (
        <>
          <div className={styles.field}>
            <label htmlFor="ef-volunteerRoles">Volunteer Roles (comma separated)</label>
            <input type="text" id="ef-volunteerRoles" name="volunteerRoles" value={formData.volunteerRoles} onChange={handleChange} placeholder="e.g., Setup, Cleanup, Photography" />
          </div>
          <div className={styles.field}>
            <label htmlFor="ef-volunteerDesc">Volunteer Description</label>
            <textarea id="ef-volunteerDesc" name="volunteerDescription" value={formData.volunteerDescription} onChange={handleChange} placeholder="Describe what volunteers will do..." rows={2} />
          </div>
        </>
      )}

      {!compact && (
        <>
          <div className={styles.checkboxField}>
            <input type="checkbox" id="ef-donations" name="acceptsDonations" checked={formData.acceptsDonations} onChange={handleChange} />
            <label htmlFor="ef-donations">Accept Donations</label>
          </div>

          {formData.acceptsDonations && (
            <div className={styles.donationFields}>
              <DonationAddressPicker
                savedAddresses={userDonationAddrs}
                selectedAddresses={formData.selectedDonationAddrs}
                onAddressesChange={(addrs) => set({ selectedDonationAddrs: addrs })}
              />
            </div>
          )}

          <div className={styles.field}>
            <label>Hashtags</label>
            <HashtagInput value={formData.hashtags} onChange={(tags) => set({ hashtags: tags })} placeholder="Add hashtags..." />
          </div>

          <details className={styles.settingsDetails}>
            <summary className={styles.settingsSummary}>Entity Linking</summary>
            {fixedProjectId ? (
              <div className={styles.fixedProjectNotice}>
                This event will be linked to: <strong>{fixedProjectTitle || 'this project'}</strong>
              </div>
            ) : (
              <AssetPicker
                filterTypes={['PROJECT', 'GROUP', 'SHOP', 'SCHOOL']}
                selectedAsset={selectedLinkedAsset}
                onSelect={handleLinkedAsset}
                label="Link to a project, group, shop, or school"
              />
            )}
          </details>
        </>
      )}

      {(onCancel || submitLabel) && (
        <div className={styles.actions}>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : (submitLabel || (mode === 'create' ? 'Create Event' : 'Save Changes'))}
          </button>
        </div>
      )}
    </form>
  )
}
