'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/context/ToastContext'

/**
 * One-time nudge to follow a recent counterparty (buyer/seller/host/guest).
 * Dismissal persists per user in localStorage; already-following hides it.
 */
export default function ConnectNudge({
  userId,
  name,
  context,
}: {
  userId: string
  name: string
  context: string
}) {
  const { success, error } = useToast()
  const [visible, setVisible] = useState(false)
  const [following, setFollowing] = useState(false)

  useEffect(() => {
    if (!userId) return
    try {
      if (localStorage.getItem(`nudge-connect-${userId}`)) return
    } catch {}
    fetch(`/api/follow/status?userId=${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const isFollowing = d?.following ?? d?.data?.following ?? false
        setVisible(!isFollowing)
      })
      .catch(() => {})
  }, [userId])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(`nudge-connect-${userId}`, '1')
    } catch {}
    setVisible(false)
  }

  const follow = async () => {
    setFollowing(true)
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedId: userId }),
      })
      if (res.ok) {
        success(`Following ${name}!`)
        dismiss()
      } else {
        error('Could not follow right now')
      }
    } catch {
      error('Could not follow right now')
    } finally {
      setFollowing(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 16px', marginBottom: 16, borderRadius: 12,
        border: '1px solid var(--border-color)', background: 'var(--bg-secondary)',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>🤝</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', flex: 1, minWidth: 200 }}>
        Enjoyed working with <strong>{name}</strong> ({context})? Follow them to see their future listings.
      </span>
      <button
        onClick={follow}
        disabled={following}
        style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent-primary)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
      >
        {following ? 'Following…' : 'Follow'}
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem' }}
      >
        ✕
      </button>
    </div>
  )
}
