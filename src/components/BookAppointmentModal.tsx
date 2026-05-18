'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface TimeSlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

interface BookAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  sellerId: string
  sellerName?: string | null
  productId?: string | null
  productTitle?: string | null
  defaultDuration?: number | null
  defaultLocation?: string | null
  defaultMeetingLink?: string | null
}

export default function BookAppointmentModal({
  isOpen, onClose, sellerId, sellerName, productId, productTitle,
  defaultDuration, defaultLocation, defaultMeetingLink
}: BookAppointmentModalProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [title, setTitle] = useState(productTitle ? `Appointment: ${productTitle}` : '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(defaultLocation || '')
  const [meetingLink, setMeetingLink] = useState(defaultMeetingLink || '')
  const [booking, setBooking] = useState(false)
  const [busySlots, setBusySlots] = useState<{ type: string; start: string; end: string; title: string }[]>([])
  const [loadingBusy, setLoadingBusy] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    fetch(`/api/availability?userId=${sellerId}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots || []))
      .catch(() => toastError('Failed to load availability'))
      .finally(() => setLoading(false))
  }, [isOpen, sellerId])

  useEffect(() => {
    if (!selectedDate) return
    setLoadingBusy(true)
    setSelectedTime('')
    fetch(`/api/appointments/busy-slots?userId=${sellerId}&date=${selectedDate}`)
      .then(r => r.json())
      .then(data => setBusySlots(data.slots || []))
      .catch(() => setBusySlots([]))
      .finally(() => setLoadingBusy(false))
  }, [selectedDate, sellerId])

  function isSlotBusy(startTime: string, endTime: string): { busy: boolean; type?: string; title?: string } {
    const slotStart = new Date(`${selectedDate}T${startTime}`).getTime()
    const slotEnd = new Date(`${selectedDate}T${endTime}`).getTime()
    for (const busy of busySlots) {
      const busyStart = new Date(busy.start).getTime()
      const busyEnd = new Date(busy.end).getTime()
      if (slotStart < busyEnd && slotEnd > busyStart) {
        return { busy: true, type: busy.type, title: busy.title }
      }
    }
    return { busy: false }
  }

  function hasDateBusySlots(dayOfWeek: number): boolean {
    if (!selectedDate) return false
    const d = new Date(selectedDate)
    if (d.getDay() !== dayOfWeek) return false
    return busySlots.length > 0
  }

  if (!isOpen) return null

  const availableDates = slots.map(s => s.dayOfWeek)
  const selectedDay = selectedDate ? new Date(selectedDate).getDay() : -1
  const daySlots = slots.filter(s => s.dayOfWeek === selectedDay)

  const getNextAvailableDate = (dayOfWeek: number) => {
    const today = new Date()
    const diff = (dayOfWeek - today.getDay() + 7) % 7
    const next = new Date(today)
    next.setDate(today.getDate() + (diff === 0 ? 7 : diff))
    return next.toISOString().split('T')[0]
  }

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || booking) return
    if (!selectedDate || !selectedTime) {
      toastError('Please select a date and time')
      return
    }
    setBooking(true)
    try {
      const startTime = new Date(`${selectedDate}T${selectedTime}`)
      const endTime = new Date(startTime.getTime() + (defaultDuration || 60) * 60000)

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || 'Appointment',
          description: description.trim() || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: defaultDuration || 60,
          location: location || null,
          meetingLink: meetingLink || null,
          sellerId,
          productId: productId || null
        })
      })

      if (res.ok) {
        success('Appointment booked!')
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
          Duration: {defaultDuration || 60} min
        </p>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading availability...</div>
        ) : slots.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No availability set yet. Check back later.
          </div>
        ) : (
          <form onSubmit={handleBook}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Available Days</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Array.from({ length: 7 }, (_, i) => {
                  const hasSlot = availableDates.includes(i)
                  const dateStr = getNextAvailableDate(i)
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!hasSlot}
                      onClick={() => {
                        setSelectedDate(dateStr)
                        setSelectedTime('')
                      }}
                      style={{
                        padding: '6px 10px', borderRadius: 6, fontSize: '0.8rem',
                        border: `1px solid ${selectedDate === dateStr ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: selectedDate === dateStr ? 'var(--accent-primary)' : hasSlot ? 'transparent' : 'var(--bg-tertiary)',
                        color: selectedDate === dateStr ? '#fff' : hasSlot ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: hasSlot ? 'pointer' : 'not-allowed', opacity: hasSlot ? 1 : 0.4
                      }}
                    >
                      {DAYS[i]}
                    </button>
                  )
                })}
              </div>
            </div>

            {daySlots.length > 0 && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Time {loadingBusy && <span style={{ color: 'var(--text-muted)' }}>(checking availability...)</span>}
                  </label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {daySlots.map((slot, i) => {
                      const conflict = isSlotBusy(slot.startTime, slot.endTime)
                      const isBusy = conflict.busy && conflict.type === 'CONFIRMED'
                      const isRequested = conflict.busy && conflict.type === 'PENDING'
                      return (
                        <div key={i} style={{ position: 'relative' }}>
                          <button
                            type="button"
                            disabled={isBusy || loadingBusy}
                            onClick={() => setSelectedTime(slot.startTime)}
                            title={conflict.title || ''}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: '0.8rem',
                              border: `1px solid ${
                                isBusy ? '#ef4444' :
                                isRequested ? '#f59e0b' :
                                selectedTime === slot.startTime ? 'var(--accent-primary)' : 'var(--border-color)'
                              }`,
                              background: isBusy ? '#ef444420' :
                                isRequested ? '#f59e0b20' :
                                selectedTime === slot.startTime ? 'var(--accent-primary)' : 'transparent',
                              color: isBusy ? '#ef4444' :
                                isRequested ? '#f59e0b' :
                                selectedTime === slot.startTime ? '#fff' : 'var(--text-primary)',
                              cursor: isBusy ? 'not-allowed' : loadingBusy ? 'wait' : 'pointer',
                              opacity: isBusy ? 0.5 : isRequested ? 0.7 : 1
                            }}
                          >
                            {slot.startTime} - {slot.endTime}
                          </button>
                          {isBusy && <span style={{ position: 'absolute', bottom: -14, left: 0, fontSize: '0.65rem', color: '#ef4444', whiteSpace: 'nowrap' }}>Booked</span>}
                          {isRequested && <span style={{ position: 'absolute', bottom: -14, left: 0, fontSize: '0.65rem', color: '#f59e0b', whiteSpace: 'nowrap' }}>Requested</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {selectedTime && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected</label>
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.85rem' }}>
                      {new Date(selectedDate).toLocaleDateString()} at {selectedTime} ({defaultDuration || 60} min)
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Description (optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Location (optional)</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Physical address"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Meeting Link (optional)</label>
              <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..."
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={booking || !selectedDate || !selectedTime}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: booking ? 'not-allowed' : 'pointer', opacity: booking ? 0.6 : 1 }}>
                {booking ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
