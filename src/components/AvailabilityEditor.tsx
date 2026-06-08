'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'
import Skeleton from '@/components/Skeleton'

interface Slot {
  id?: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

interface AvailabilityEditorProps {
  userId: string
}

export default function AvailabilityEditor({ userId }: AvailabilityEditorProps) {
  const toast = useToast()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newSlot, setNewSlot] = useState<Slot>({ dayOfWeek: 0, startTime: '09:00', endTime: '17:00', isActive: true })

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    fetch(`/api/availability?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.slots) setSlots(data.slots)
      })
      .finally(() => setLoading(false))
  }, [userId])

  const addSlot = async () => {
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
    } catch (e: any) {
      toast.error(e.message || 'Failed to add slot')
    } finally {
      setSaving(false)
    }
  }

  const toggleSlot = async (slot: Slot) => {
    try {
      await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slot, isActive: !slot.isActive })
      })
      setSlots(prev => prev.map(s => s.id === slot.id ? { ...s, isActive: !s.isActive } : s))
    } catch { /* ignore */ }
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

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Appointment Availability</label>

      {loading ? (
        <Skeleton width="100%" height="1rem" />
      ) : slots.length === 0 ? (
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 12 }}>No availability slots set.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {slots.map((slot, i) => (
            <div key={slot.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: '0.85rem' }}>
              <span style={{ fontWeight: 600, minWidth: 40 }}>{DAYS[slot.dayOfWeek]}</span>
              <span>{slot.startTime} – {slot.endTime}</span>
              <button
                type="button"
                onClick={() => toggleSlot(slot)}
                style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 4, border: 'none', fontSize: '0.75rem', cursor: 'pointer', background: slot.isActive ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: slot.isActive ? '#fff' : 'var(--text-tertiary)' }}
              >
                {slot.isActive ? 'Active' : 'Inactive'}
              </button>
              <button type="button" onClick={() => removeSlot(slot)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger, #e44)', cursor: 'pointer', fontSize: '1rem' }} title="Remove slot">✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={newSlot.dayOfWeek}
          onChange={e => setNewSlot(prev => ({ ...prev, dayOfWeek: Number(e.target.value) }))}
          style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
        <select
          value={newSlot.startTime}
          onChange={e => setNewSlot(prev => ({ ...prev, startTime: e.target.value }))}
          style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span style={{ color: 'var(--text-tertiary)' }}>to</span>
        <select
          value={newSlot.endTime}
          onChange={e => setNewSlot(prev => ({ ...prev, endTime: e.target.value }))}
          style={{ padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.85rem' }}
        >
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <button type="button" onClick={addSlot} disabled={saving} style={{
          padding: '6px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', opacity: saving ? 0.6 : 1
        }}>
          {saving ? 'Adding...' : '+ Add Slot'}
        </button>
      </div>
    </div>
  )
}
