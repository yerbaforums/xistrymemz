'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'

interface FormField {
  label: string
  type: 'text' | 'textarea'
  required: boolean
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
}

export default function BookAppointmentModal({
  isOpen, onClose, sellerId, sellerName, productId, productTitle,
  defaultDuration, defaultLeadTime, defaultLocation, defaultMeetingLink, formFields
}: BookAppointmentModalProps) {
  const { data: session } = useSession()
  const { success, error: toastError } = useToast()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [title, setTitle] = useState(productTitle ? `Appointment: ${productTitle}` : '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(defaultLocation || '')
  const [meetingLink, setMeetingLink] = useState(defaultMeetingLink || '')
  const [formResponses, setFormResponses] = useState<Record<string, string>>({})
  const [booking, setBooking] = useState(false)

  if (!isOpen) return null

  const getMinDate = () => {
    if (!defaultLeadTime) return new Date().toISOString().split('T')[0]
    const d = new Date()
    d.setHours(d.getHours() + defaultLeadTime)
    return d.toISOString().split('T')[0]
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
      const endTime = new Date(startTime.getTime() + (defaultDuration || 60) * 60000)

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
          duration: defaultDuration || 60,
          location: location || null,
          meetingLink: meetingLink || null,
          sellerId,
          productId: productId || null,
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
          {defaultLeadTime ? ` · ${defaultLeadTime}h lead time` : ''}
        </p>

        <form onSubmit={handleBook}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              min={getMinDate()}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Time
            </label>
            <input
              type="time"
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          {selectedDate && selectedTime && (
            <div style={{
              marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: 'var(--bg-tertiary)', fontSize: '0.85rem', color: 'var(--text-secondary)'
            }}>
              Selected: {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
              {defaultDuration ? ` (${defaultDuration} min)` : ''}
            </div>
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
