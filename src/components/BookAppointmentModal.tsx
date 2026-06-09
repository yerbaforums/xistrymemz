'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import styles from './BookAppointmentModal.module.css'
import { EmptyState } from '@/components/EmptyState'

interface FormField {
  label: string
  type: 'text' | 'textarea'
  required: boolean
}

interface AvailSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface BusySlot {
  type: string
  start: string
  end: string
  title: string
}

type MeetingLinkType = 'default' | 'platform' | 'custom' | 'none'

interface BookAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  sellerId: string
  sellerName?: string | null
  productId?: string | null
  productTitle?: string | null
  defaultDuration?: number | null
  defaultLeadTime?: number | null
  defaultLocation?: string | null
  defaultMeetingLink?: string | null
  formFields?: FormField[] | null
  serviceCategory?: string | null
  serviceOfferingId?: string | null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatTimeDisplay(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function BookAppointmentModal({
  isOpen, onClose, sellerId, sellerName, productId, productTitle,
  defaultDuration, defaultLeadTime, defaultLocation, defaultMeetingLink, formFields,
  serviceCategory, serviceOfferingId
}: BookAppointmentModalProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [title, setTitle] = useState(productTitle ? `Appointment: ${productTitle}` : '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(defaultLocation || '')
  const [meetingLinkType, setMeetingLinkType] = useState<MeetingLinkType>(
    defaultMeetingLink ? 'default' : 'none'
  )
  const [customMeetingLink, setCustomMeetingLink] = useState('')
  const [platformRoom, setPlatformRoom] = useState<{ id: string; inviteCode: string; name: string } | null>(null)
  const [creatingRoom, setCreatingRoom] = useState(false)
  const [formResponses, setFormResponses] = useState<Record<string, string>>({})
  const [booking, setBooking] = useState(false)

  const [availSlots, setAvailSlots] = useState<AvailSlot[]>([])
  const [loadingAvail, setLoadingAvail] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [busySlots, setBusySlots] = useState<BusySlot[]>([])
  const [loadingBusy, setLoadingBusy] = useState(false)

  const duration = defaultDuration || 60
  const leadTime = defaultLeadTime || 0

  useEffect(() => {
    if (!isOpen) return
    setLoadingAvail(true)
    setSelectedDate('')
    setSelectedTime('')
    setCurrentMonth(new Date())
    setBusySlots([])
    setMeetingLinkType(defaultMeetingLink ? 'default' : 'none')
    setCustomMeetingLink('')
    setPlatformRoom(null)
    fetch(`/api/availability?userId=${sellerId}`)
      .then(r => r.json())
      .then(data => setAvailSlots(data.slots || []))
      .catch(() => setAvailSlots([]))
      .finally(() => setLoadingAvail(false))
  }, [isOpen, sellerId])

  useEffect(() => {
    if (!selectedDate) { setBusySlots([]); return }
    setLoadingBusy(true)
    fetch(`/api/appointments/busy-slots?userId=${sellerId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(data => setBusySlots(data.slots || []))
      .catch(() => setBusySlots([]))
      .finally(() => setLoadingBusy(false))
  }, [selectedDate, sellerId])

  useEffect(() => {
    setSelectedTime('')
  }, [selectedDate])

  const minDateStr = useMemo(() => {
    const d = new Date()
    d.setHours(d.getHours() + leadTime)
    return d.toISOString().split('T')[0]
  }, [leadTime])

  const minDate = new Date(minDateStr)

  function isDateAvailable(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    if (d < minDate) return false
    const dow = d.getDay()
    return availSlots.some(s => s.dayOfWeek === dow)
  }

  function getFreeTimes() {
    if (!selectedDate || busySlots.length === 0 && !loadingBusy) {
    }
    const d = new Date(selectedDate + 'T12:00:00')
    const dow = d.getDay()
    const daySlots = availSlots.filter(s => s.dayOfWeek === dow)
    if (daySlots.length === 0) return []

    const isToday = selectedDate === new Date().toISOString().split('T')[0]
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const leadMinutes = leadTime * 60

    const busyRanges = busySlots.map(s => ({
      start: toMinutes(s.start.split('T')[1]?.slice(0, 5) || '00:00'),
      end: toMinutes(s.end.split('T')[1]?.slice(0, 5) || '23:59')
    }))

    const allTimes: string[] = []
    for (const slot of daySlots) {
      const startM = toMinutes(slot.startTime)
      const endM = toMinutes(slot.endTime)
      for (let m = startM; m + duration <= endM; m += 15) {
        const h = Math.floor(m / 60)
        const min = m % 60
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        const timeEnd = m + duration

        if (isToday && m <= nowMinutes + leadMinutes) continue
        const overlaps = busyRanges.some(b => m < b.end && timeEnd > b.start)
        if (overlaps) continue

        allTimes.push(timeStr)
      }
    }
    return allTimes
  }

  const freeTimes = getFreeTimes()

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [currentMonth])

  function prevMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  function formatDate(year: number, month: number, day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isDateInPast(day: number) {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    d.setHours(12, 0, 0, 0)
    minDate.setHours(12, 0, 0, 0)
    return d < minDate
  }

  async function handleCreatePlatformRoom() {
    setCreatingRoom(true)
    try {
      const res = await fetch('/api/video/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${productTitle || 'Appointment'} Video Room` })
      })
      if (!res.ok) throw new Error('Failed to create room')
      const data = await res.json()
      setPlatformRoom(data.room)
      return data.room
    } catch {
      toastError('Failed to create video room')
      return null
    } finally {
      setCreatingRoom(false)
    }
  }

  function getMeetingLinkValue(): string | null {
    if (meetingLinkType === 'none') return null
    if (meetingLinkType === 'default') return defaultMeetingLink || null
    if (meetingLinkType === 'platform' && platformRoom) {
      return `${window.location.origin}/dashboard/video?invite=${platformRoom.inviteCode}`
    }
    if (meetingLinkType === 'custom') return customMeetingLink.trim() || null
    return null
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || booking) return
    if (!selectedDate || !selectedTime) {
      toastError('Please select a date and time')
      return
    }

    if (formFields) {
      for (const field of formFields) {
        if (field.required && !formResponses[field.label]?.trim()) {
          toastError(`"${field.label}" is required`)
          return
        }
      }
    }

    let finalMeetingLink = getMeetingLinkValue()

    if (meetingLinkType === 'platform' && !platformRoom) {
      const room = await handleCreatePlatformRoom()
      if (room) {
        finalMeetingLink = `${window.location.origin}/dashboard/video?invite=${room.inviteCode}`
      } else {
        toastError('Failed to create video room. Please try a different meeting option.')
        return
      }
    }

    setBooking(true)
    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}`)
      const endTime = new Date(startTime.getTime() + duration * 60000)

      const responses = formFields
        ? formFields.map(f => ({ label: f.label, value: formResponses[f.label] || '' }))
        : undefined

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Appointment',
          description: description.trim() || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration,
          location: location || null,
          meetingLink: finalMeetingLink,
          sellerId,
          productId: productId || null,
          category: serviceCategory || null,
          serviceOfferingId: serviceOfferingId || null,
          formResponses: responses
        })
      })

      if (res.ok) {
        success('Booking request sent!')
        onClose()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to book')
      }
    } catch {
      toastError('Failed to book appointment')
    } finally {
      setBooking(false)
    }
  }

  if (!isOpen) return null

  const hasAvailability = availSlots.length > 0

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.heading}>
          {productId ? `Book: ${productTitle}` : `Book with ${sellerName || 'Seller'}`}
        </h3>
        <p className={styles.subtitle}>
          Duration: {duration} min
          {leadTime ? ` · ${leadTime}h lead time` : ''}
        </p>

        <form onSubmit={handleBook}>
          {loadingAvail ? (
            <div className={styles.statusMsg}>
              Loading availability...
            </div>
          ) : !hasAvailability ? (
            <div className={styles.statusMsg}>
              <p className={styles.m004}>Seller hasn't set their availability yet.</p>
              <p className={styles.m0}>Please check back later or contact the seller directly.</p>
            </div>
          ) : (
            <>
              {/* Calendar */}
              <div className={styles.mb16}>
                <label className={styles.label}>Select Date</label>
                <div className={styles.calendarInner}>
                  {/* Month nav */}
                  <div className={`${styles.flexBetween} ${styles.mb8}`}>
                    <button type="button" onClick={prevMonth} className={styles.monthNavBtn}>
                      &lt;
                    </button>
                    <span className={styles.monthLabel}>
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button type="button" onClick={nextMonth} className={styles.monthNavBtn}>
                      &gt;
                    </button>
                  </div>
                  {/* Day headers */}
                  <div className={styles.dayHeaderGrid}>
                    {DAYS.map(d => (
                      <div key={d} className={styles.dayHeaderCell}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div className={styles.dayCellsGrid}>
                    {calendarCells.map((day, i) => {
                      if (day === null) return <div key={`e-${i}`} />
                      const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                      const available = isDateAvailable(dateStr)
                      const isPast = isDateInPast(day)
                      const isSelected = selectedDate === dateStr
                      const clickable = available && !isPast

                      return (
                        <button
                          key={dateStr}
                          type="button"
                          disabled={!clickable}
                          onClick={() => { setSelectedDate(dateStr); setSelectedTime('') }}
                          className={styles.dayCellBtn}
                          style={{
                            border: isSelected ? '2px solid var(--accent-primary)' : 'none',
                            background: isSelected ? 'var(--accent-primary)' : clickable ? 'var(--bg-secondary)' : 'transparent',
                            color: isSelected ? '#fff' : clickable ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            cursor: clickable ? 'pointer' : 'default',
                            fontWeight: clickable ? 500 : 400,
                            opacity: clickable ? 1 : 0.4,
                          }}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div className={styles.mb16}>
                  <label className={styles.label}>Select Time</label>
                  {loadingBusy ? (
                    <div className={styles.loadingTimes}>
                      Loading available times...
                    </div>
                  ) : freeTimes.length === 0 ? (
                    <EmptyState icon="⏰" title="No time slots available" description="Try selecting a different date." />
                  ) : (
                    <div className={`${styles.flexWrap} ${styles.gap6}`}>
                      {freeTimes.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          className={styles.timeSlotBtn}
                          style={{
                            border: selectedTime === t ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            background: selectedTime === t ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: selectedTime === t ? '#fff' : 'var(--text-primary)',
                          }}
                          onMouseEnter={e => { if (selectedTime !== t) e.currentTarget.style.borderColor = 'var(--accent-primary)' }}
                          onMouseLeave={e => { if (selectedTime !== t) e.currentTarget.style.borderColor = 'var(--border-color)' }}
                        >
                          {formatTimeDisplay(t)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedDate && selectedTime && (
                <div className={`${styles.selectedInfo} ${styles.mb16}`}>
                  Selected: {new Date(selectedDate).toLocaleDateString()} at {formatTimeDisplay(selectedTime)}
                  ({duration} min)
                </div>
              )}
            </>
          )}

          <div className={styles.mb12}>
            <label className={styles.label}>Title</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              className={styles.input}
            />
          </div>

          {formFields && formFields.length > 0 && (
            <div className={`${styles.formSection} ${styles.mb12}`}>
              <p className={styles.formSectionHeading}>
                Additional Information Requested
              </p>
              {formFields.map(f => (
                <div key={f.label} className={styles.mb8}>
                  <label className={`${styles.label} ${styles.fs082}`}>
                    {f.label} {f.required && <span className={styles.requiredStar}>*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={formResponses[f.label] || ''}
                      onChange={e => setFormResponses(r => ({ ...r, [f.label]: e.target.value }))}
                      rows={3}
                      className={styles.textareaField}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formResponses[f.label] || ''}
                      onChange={e => setFormResponses(r => ({ ...r, [f.label]: e.target.value }))}
                      className={styles.inputField}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={styles.mb12}>
            <label className={styles.label}>Notes / Comments</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Anything the seller should know..."
              className={`${styles.input} ${styles.resizeVertical}`}
            />
          </div>

          <div className={styles.mb12}>
            <label className={styles.label}>Location (optional)</label>
            <input
              type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Physical address or meeting point"
              className={styles.input}
            />
          </div>

          {/* Meeting Link Selection */}
          <div className={styles.mb20}>
            <label className={`${styles.label} ${styles.fw600}`}>Video Call / Meeting Link</label>
            <div className={`${styles.flexCol} ${styles.gap8} ${styles.mt4}`}>
              {defaultMeetingLink && (
                <label className={styles.meetingOption}
                  style={{
                    border: meetingLinkType === 'default' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                    background: meetingLinkType === 'default' ? 'var(--bg-tertiary)' : 'transparent',
                  }}>
                  <input
                    type="radio" name="meetingLinkType" checked={meetingLinkType === 'default'}
                    onChange={() => setMeetingLinkType('default')}
                    className={styles.radioInput}
                  />
                  <div>
                    <div className={styles.meetingOptionTitle}>
                      Use seller&apos;s link
                    </div>
                    <div className={`${styles.meetingOptionDesc} ${styles.wordBreakAll}`}>
                      {defaultMeetingLink}
                    </div>
                  </div>
                </label>
              )}

              <label className={styles.meetingOption}
                style={{
                  border: meetingLinkType === 'platform' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: meetingLinkType === 'platform' ? 'var(--bg-tertiary)' : 'transparent',
                }}>
                <input
                  type="radio" name="meetingLinkType" checked={meetingLinkType === 'platform'}
                  onChange={() => setMeetingLinkType('platform')}
                  className={styles.radioInput}
                />
                <div className={styles.optionFlex}>
                  <div className={styles.meetingOptionTitle}>
                    Platform Video Room
                  </div>
                  <div className={styles.meetingOptionDesc}>
                    Create a video room on this platform. A link will be generated automatically.
                  </div>
                  {meetingLinkType === 'platform' && platformRoom && (
                    <div className={styles.platformLink}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/dashboard/video?invite=${platformRoom.inviteCode}` : ''}
                    </div>
                  )}
                  {meetingLinkType === 'platform' && !platformRoom && (
                    <button
                      type="button"
                      onClick={handleCreatePlatformRoom}
                      disabled={creatingRoom}
                      className={styles.videoRoomBtn}
                      style={{
                        cursor: creatingRoom ? 'not-allowed' : 'pointer',
                        opacity: creatingRoom ? 0.6 : 1
                      }}
                    >
                      {creatingRoom ? 'Creating...' : 'Create Video Room'}
                    </button>
                  )}
                </div>
              </label>

              <label className={styles.meetingOption}
                style={{
                  border: meetingLinkType === 'custom' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: meetingLinkType === 'custom' ? 'var(--bg-tertiary)' : 'transparent',
                }}>
                <input
                  type="radio" name="meetingLinkType" checked={meetingLinkType === 'custom'}
                  onChange={() => setMeetingLinkType('custom')}
                  className={styles.radioInput}
                />
                <div className={styles.optionFlex}>
                  <div className={styles.meetingOptionTitle}>
                    Custom meeting link
                  </div>
                  {meetingLinkType === 'custom' && (
                    <input
                      type="url"
                      value={customMeetingLink}
                      onChange={e => setCustomMeetingLink(e.target.value)}
                      placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                      className={`${styles.input} ${styles.mt6}`}
                    />
                  )}
                </div>
              </label>

              <label className={styles.meetingOption}
                style={{
                  border: meetingLinkType === 'none' ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: meetingLinkType === 'none' ? 'var(--bg-tertiary)' : 'transparent',
                }}>
                <input
                  type="radio" name="meetingLinkType" checked={meetingLinkType === 'none'}
                  onChange={() => setMeetingLinkType('none')}
                  className={styles.radioInput}
                />
                <div>
                  <div className={styles.meetingOptionTitle}>
                    No meeting link
                  </div>
                  <div className={styles.meetingOptionDesc}>
                    In-person or no video needed
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className={`${styles.flexEnd} ${styles.gap8}`}>
            <button type="button" onClick={onClose}
              className={styles.cancelBtn}>
              Cancel
            </button>
            <button type="submit" disabled={booking || !selectedDate || !selectedTime}
              className={styles.submitBtn}
              style={{
                cursor: booking ? 'not-allowed' : 'pointer',
                opacity: booking ? 0.6 : 1
              }}>
              {booking ? 'Booking...' : 'Send Booking Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}