'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'
import styles from './AvailabilityEditor.module.css'

interface Slot {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

interface AvailabilityEditorProps {
  userId: string
  /** Hide the internal heading when the host page already provides one. */
  showHeading?: boolean
}

export default function AvailabilityEditor({ userId, showHeading = true }: AvailabilityEditorProps) {
  const toast = useToast()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newSlot, setNewSlot] = useState<Slot>({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true })

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/availability?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.data?.slots || data?.slots) setSlots(data?.data?.slots || data?.slots)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const addSlot = async () => {
    if (newSlot.startTime >= newSlot.endTime) {
      toast.error('End time must be after start time')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSlot)
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      const { slot } = await res.json()
      setSlots(prev => [...prev.filter(s => s.id !== slot.id), slot].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)))
      toast.success('Availability slot added')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to add slot')
    } finally {
      setSaving(false)
    }
  }

  const toggleSlot = async (slot: Slot) => {
    setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: !s.isActive } : s))
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slot, isActive: !slot.isActive })
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert on failure
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: slot.isActive } : s))
      toast.error('Failed to update slot')
    }
  }

  const removeSlot = async (slot: Slot) => {
    try {
      await fetch(`/api/availability/${slot.id}`, { method: 'DELETE' })
      setSlots(prev => prev.filter(s => s.id !== slot.id))
      toast.success('Slot removed')
    } catch {
      toast.error('Failed to remove slot')
    }
  }

  const activeCount = slots.filter(s => s.isActive).length

  return (
    <section className={styles.wrap}>
      {showHeading && (
        <div className={styles.header}>
          <h3 className={styles.title}>🗓️ Weekly Availability</h3>
          <span className={styles.count}>
            {slots.length === 0 ? 'No slots yet' : `${activeCount} of ${slots.length} active`}
          </span>
        </div>
      )}

      {loading ? (
        <Skeleton width="100%" height="1rem" />
      ) : slots.length === 0 ? (
        <p className={styles.empty}>No availability slots yet — add the days and hours you take bookings.</p>
      ) : (
        <ul className={styles.slotList}>
          {slots.map((slot, i) => (
            <li key={slot.id || i} className={`${styles.slot} ${slot.isActive ? '' : styles.slotOff}`}>
              <span className={styles.day}>{DAYS_FULL[slot.dayOfWeek]}</span>
              <span className={styles.time}>{slot.startTime} – {slot.endTime}</span>
              <label className="toggle-switch" title={slot.isActive ? 'Active' : 'Inactive'}>
                <input
                  type="checkbox"
                  checked={slot.isActive}
                  onChange={() => toggleSlot(slot)}
                  aria-label={`${slot.isActive ? 'Disable' : 'Enable'} ${DAYS_FULL[slot.dayOfWeek]} ${slot.startTime} slot`}
                />
                <span className="toggle-slider" />
              </label>
              <button
                type="button"
                onClick={() => removeSlot(slot)}
                className={styles.removeBtn}
                aria-label={`Remove ${DAYS_FULL[slot.dayOfWeek]} slot`}
                title="Remove slot"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.addRow}>
        <select
          className={styles.select}
          value={newSlot.dayOfWeek}
          onChange={e => setNewSlot(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
          aria-label="Day of week"
        >
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <select
          className={styles.select}
          value={newSlot.startTime}
          onChange={e => setNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
          aria-label="Start time"
        >
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className={styles.to}>to</span>
        <select
          className={styles.select}
          value={newSlot.endTime}
          onChange={e => setNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
          aria-label="End time"
        >
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <button type="button" onClick={addSlot} disabled={saving} className={styles.addBtn}>
          {saving ? 'Adding…' : '+ Add slot'}
        </button>
      </div>
    </section>
  )
}
