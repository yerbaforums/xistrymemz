'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

interface SponsorButtonProps {
  entityType: 'REQUEST' | 'PROJECT' | 'SCHOOL'
  entityId: string
  isOwner: boolean
  compact?: boolean
}

export default function SponsorButton({ entityType, entityId, isOwner, compact }: SponsorButtonProps) {
  const { success, error } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('XMR')
  const [saving, setSaving] = useState(false)

  if (isOwner) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!value || value <= 0) {
      error('Enter a monthly amount')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/sponsorships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, amount: value, currency }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok) {
        success('Monthly sponsorship started!')
        setOpen(false)
        router.push('/dashboard/sponsorships')
      } else {
        error(data?.error || 'Failed to start sponsorship')
      }
    } catch {
      error('Failed to start sponsorship')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Pledge a monthly donation"
        style={compact ? undefined : { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent-primary)', background: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
      >
        💝 Sponsor monthly
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Start monthly sponsorship" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setOpen(false)}>
          <form onSubmit={submit} style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 20, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3>💝 Sponsor monthly</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              You&apos;ll get a monthly reminder showing the owner&apos;s donation address. Complete it when you&apos;ve sent it — or skip any month.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="Amount / month" required autoFocus aria-label="Monthly amount"
                style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}
              />
              <select value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Currency" style={{ padding: 8, borderRadius: 6, border: '1px solid var(--border-color)' }}>
                {['XMR', 'XTM', 'ZANO', 'FUSD', 'USD'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setOpen(false)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer' }}>
                {saving ? 'Starting...' : 'Start sponsoring'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
