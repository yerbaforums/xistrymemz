'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'

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
  const [meetingLink, setMeetingLink] = useState(defaultMeetingLink || '')
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
      // If no busy slots loaded yet, compute from availSlots only
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
          meetingLink: meetingLink || null,
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)'
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: 12, padding: 24,
        maxWidth: 520, width: '90%', maxHeight: '85vh', overflow: 'auto'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem' }}>
          {productId ? `Book: ${productTitle}` : `Book with ${sellerName || 'Seller'}`}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Duration: {duration} min
          {leadTime ? ` · ${leadTime}h lead time` : ''}
        </p>

        <form onSubmit={handleBook}>
          {loadingAvail ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              Loading availability...
            </div>
          ) : !hasAvailability ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              <p style={{ margin: '0 0 4px' }}>Seller hasn't set their availability yet.</p>
              <p style={{ margin: 0 }}>Please check back later or contact the seller directly.</p>
            </div>
          ) : (
            <>
              {/* Calendar */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Select Date
                </label>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: 12, border: '1px solid var(--border-color)' }}>
                  {/* Month nav */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '1rem', padding: '2px 8px' }}>
                      &lt;
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                    <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '1rem', padding: '2px 8px' }}>
                      &gt;
                    </button>
                  </div>
                  {/* Day headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                    {DAYS.map(d => (
                      <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', padding: '4px 0', fontWeight: 600 }}>
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Day cells */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
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
                          style={{
                            padding: '6px 0',
                            borderRadius: 6,
                            border: isSelected ? '2px solid var(--accent-primary)' : 'none',
                            background: isSelected ? 'var(--accent-primary)' : clickable ? 'var(--bg-secondary)' : 'transparent',
                            color: isSelected ? '#fff' : clickable ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            cursor: clickable ? 'pointer' : 'default',
                            fontSize: '0.8rem',
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
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Select Time
                  </label>
                  {loadingBusy ? (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                      Loading available times...
                    </div>
                  ) : freeTimes.length === 0 ? (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                      No available time slots on this date.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {freeTimes.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setSelectedTime(t)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: 8,
                            border: selectedTime === t ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                            background: selectedTime === t ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: selectedTime === t ? '#fff' : 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 500,
                            transition: 'all 0.15s',
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
                <div style={{
                  marginBottom: 16, padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-tertiary)', fontSize: '0.85rem', color: 'var(--text-secondary)'
                }}>
                  Selected: {new Date(selectedDate).toLocaleDateString()} at {formatTimeDisplay(selectedTime)}
                  ({duration} min)
                </div>
              )}
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Title
            </label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {formFields && formFields.length > 0 && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Additional Information Requested
              </p>
              {formFields.map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea
                      value={formResponses[f.label] || ''}
                      onChange={e => setFormResponses(r => ({ ...r, [f.label]: e.target.value }))}
                      rows={3}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        fontSize: '0.82rem', resize: 'vertical'
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formResponses[f.label] || ''}
                      onChange={e => setFormResponses(r => ({ ...r, [f.label]: e.target.value }))}
                      style={{
                        width: '100%', padding: '8px 10px', borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                        fontSize: '0.82rem'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Notes / Comments
            </label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Anything the seller should know..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Location (optional)
            </label>
            <input
              type="text" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Physical address or meeting point"
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Meeting Link (optional)
            </label>
            <input
              type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)',
                background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer'
              }}>
              Cancel
            </button>
            <button type="submit" disabled={booking || !selectedDate || !selectedTime}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--accent-primary)', color: '#fff',
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
