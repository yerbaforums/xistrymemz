'use client'

import { useState, useEffect } from 'react'
import ImageUploader from '@/components/ImageUploader'
import HashtagInput from '@/components/HashtagInput'
import DonationAddressPicker from '@/components/DonationAddressPicker'
import AssetPicker from '@/components/AssetPicker'
import LocationPicker from '@/components/LocationPicker'
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
  gateLocation: boolean
  exactAddress: string
  latitude: number | null
  longitude: number | null
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
  recurrenceRule: string | null
  recurrenceEnd: string
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
  gateLocation: false,
  exactAddress: '',
  latitude: null,
  longitude: null,
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
  recurrenceRule: null,
  recurrenceEnd: '',
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
  const [recurrenceFreq, setRecurrenceFreq] = useState<string>(() => {
    if (!formData.recurrenceRule) return 'WEEKLY'
    const match = formData.recurrenceRule.match(/FREQ=(\w+)/)
    return match ? match[1] : 'WEEKLY'
  })
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(() => {
    if (!formData.recurrenceRule) return 1
    const match = formData.recurrenceRule.match(/INTERVAL=(\d+)/)
    return match ? parseInt(match[1], 10) : 1
  })
  const [recurrenceByDay, setRecurrenceByDay] = useState<string[]>(() => {
    if (!formData.recurrenceRule) return []
    const match = formData.recurrenceRule.match(/BYDAY=([A-Z,]+)/)
    return match ? match[1].split(',') : []
  })
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'after' | 'on'>('never')
  const [recurrenceCount, setRecurrenceCount] = useState<number>(10)
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(formData.recurrenceEnd || '')
  const [recurrenceEnabled, setRecurrenceEnabled] = useState<boolean>(() => !!formData.recurrenceRule)

  const toggleByDay = (day: string) => {
    setRecurrenceByDay(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  useEffect(() => {
    if (recurrenceEnabled) {
      const parts: string[] = [`FREQ=${recurrenceFreq}`]
      if (recurrenceInterval > 1) parts.push(`INTERVAL=${recurrenceInterval}`)
      if (recurrenceFreq === 'WEEKLY' && recurrenceByDay.length > 0) {
        parts.push(`BYDAY=${recurrenceByDay.join(',')}`)
      }
      if (recurrenceEndType === 'after') {
        parts.push(`COUNT=${recurrenceCount}`)
      } else if (recurrenceEndType === 'on' && recurrenceEndDate) {
        parts.push(`UNTIL=${recurrenceEndDate.replace(/-/g, '')}T235959Z`)
      }
      set({ recurrenceRule: parts.join(';') })
      if (recurrenceEndType === 'on' && recurrenceEndDate) {
        set({ recurrenceEnd: recurrenceEndDate })
      } else if (recurrenceEndType !== 'after') {
        set({ recurrenceEnd: '' })
      }
    } else {
      set({ recurrenceRule: null, recurrenceEnd: '' })
    }
  }, [recurrenceEnabled, recurrenceFreq, recurrenceInterval, recurrenceByDay, recurrenceEndType, recurrenceEndDate, recurrenceCount])

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

      <details className={styles.settingsDetails}>
        <summary className={styles.settingsSummary}>🔁 Repeat</summary>
        <div>
          <div className={styles.checkboxField}>
            <input type="checkbox" id="ef-recurrence" checked={recurrenceEnabled}
              onChange={e => setRecurrenceEnabled(e.target.checked)} />
            <label htmlFor="ef-recurrence">Enable recurring events</label>
          </div>
          {recurrenceEnabled && (
            <>
              <div className={styles.field}>
                <label htmlFor="ef-recurrenceFreq">Frequency</label>
                <select id="ef-recurrenceFreq" value={recurrenceFreq}
                  onChange={e => setRecurrenceFreq(e.target.value)}
                  >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="ef-recurrenceInterval">Repeat every</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="number" id="ef-recurrenceInterval" value={recurrenceInterval}
                    onChange={e => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    min={1} style={{ width: 60 }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {recurrenceFreq === 'DAILY' ? 'day(s)' : recurrenceFreq === 'WEEKLY' ? 'week(s)' : recurrenceFreq === 'MONTHLY' ? 'month(s)' : 'year(s)'}
                  </span>
                </div>
              </div>
              {recurrenceFreq === 'WEEKLY' && (
                <div className={styles.field}>
                  <label>On days</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[['MO', 'Mon'], ['TU', 'Tue'], ['WE', 'Wed'], ['TH', 'Thu'], ['FR', 'Fri'], ['SA', 'Sat'], ['SU', 'Sun']].map(([code, label]) => (
                      <button key={code} type="button"
                        onClick={() => toggleByDay(code)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)',
                          background: recurrenceByDay.includes(code) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: recurrenceByDay.includes(code) ? 'var(--bg-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.field}>
                <label>Ends</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" name="recurrenceEnd" checked={recurrenceEndType === 'never'}
                      onChange={() => setRecurrenceEndType('never')} />
                    Never
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" name="recurrenceEnd" checked={recurrenceEndType === 'after'}
                      onChange={() => setRecurrenceEndType('after')} />
                    After
                    <input type="number" value={recurrenceCount} min={1} max={999}
                      onChange={e => setRecurrenceCount(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: 50, padding: '2px 6px', fontSize: '0.85rem' }}
                      onClick={e => e.stopPropagation()} />
                    occurrences
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="radio" name="recurrenceEnd" checked={recurrenceEndType === 'on'}
                      onChange={() => setRecurrenceEndType('on')} />
                    On date
                    <input type="date" value={recurrenceEndDate}
                      onChange={e => setRecurrenceEndDate(e.target.value)}
                      style={{ padding: '2px 6px', fontSize: '0.85rem' }}
                      onClick={e => e.stopPropagation()} />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>
      </details>

      <details className={styles.settingsDetails}>
        <summary className={styles.settingsSummary}>📍 Location / Virtual</summary>
        <div>
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
                    <div className={styles.meetingOptionDesc}>Create a video room on this platform.</div>
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
                    <div className={styles.meetingOptionDesc}>Use Zoom, Google Meet, etc.</div>
                    {meetingLinkType === 'custom' && (
                      <input type="url" name="meetingLink" value={formData.meetingLink} onChange={(e) => set({ meetingLink: e.target.value })} placeholder="https://zoom.us/j/..." className={styles.meetingLinkInput} />
                    )}
                  </div>
                </label>
                <label className={`${styles.meetingOption} ${meetingLinkType === 'none' ? styles.meetingOptionSelected : ''}`}>
                  <input type="radio" name="meetingLinkType" checked={meetingLinkType === 'none'} onChange={() => { setMeetingLinkType('none'); set({ meetingLink: '', videoRoomId: null }) }} />
                  <div>
                    <div className={styles.meetingOptionTitle}>No meeting link</div>
                    <div className={styles.meetingOptionDesc}>Virtual event without a video call.</div>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <>
              <LocationPicker
                value={{ text: formData.location, latitude: formData.latitude, longitude: formData.longitude }}
                onChange={v => set({ location: v.text, latitude: v.latitude, longitude: v.longitude })}
              />
              <div className={styles.field}>
                <label htmlFor="ef-locationDetails">Location Details</label>
                <input type="text" id="ef-locationDetails" name="locationDetails" value={formData.locationDetails} onChange={handleChange} placeholder="Room, floor, link, etc." />
              </div>
              <div className={styles.checkboxField}>
                <input type="checkbox" id="ef-gateLocation" name="gateLocation" checked={formData.gateLocation} onChange={handleChange} />
                <label htmlFor="ef-gateLocation">🔒 Gate exact location (only ticket holders / RSVPs see it)</label>
              </div>
              {formData.gateLocation && (
                <div className={styles.field}>
                  <label htmlFor="ef-exactAddress">Exact address (private)</label>
                  <input type="text" id="ef-exactAddress" name="exactAddress" value={formData.exactAddress} onChange={handleChange} placeholder="123 Main St, Apt 4B — only visible to verified attendees" />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>Public listing shows the area above. Exact address unlocks after ticket verification (or RSVP for free events).</p>
                </div>
              )}
            </>
          )}
        </div>
      </details>

      <details className={styles.settingsDetails}>
        <summary className={styles.settingsSummary}>🎟️ Ticketing</summary>
        <div>
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
                  <option value="ZANO">ZANO</option>
                  <option value="FUSD">FUSD</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </details>

      <details className={styles.settingsDetails}>
        <summary className={styles.settingsSummary}>🙋 Volunteers</summary>
        <div>
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
        </div>
      </details>

      {!compact && (
        <details className={styles.settingsDetails}>
          <summary className={styles.settingsSummary}>💰 Donations & Links</summary>
          <div>
            <div className={styles.checkboxField}>
              <input type="checkbox" id="ef-donations" name="acceptsDonations" checked={formData.acceptsDonations} onChange={handleChange} />
              <label htmlFor="ef-donations">Accept Donations</label>
            </div>
            {formData.acceptsDonations && (
              <DonationAddressPicker
                savedAddresses={userDonationAddrs}
                selectedAddresses={formData.selectedDonationAddrs}
                onAddressesChange={(addrs) => set({ selectedDonationAddrs: addrs })}
              />
            )}
            <div className={styles.field}>
              <label>Hashtags</label>
              <HashtagInput value={formData.hashtags} onChange={(tags) => set({ hashtags: tags })} placeholder="Add hashtags..." />
            </div>
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
          </div>
        </details>
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
