'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface FollowButtonProps {
  userId: string
  className?: string
}

export default function FollowButton({ userId, className }: FollowButtonProps) {
  const { data: session } = useSession()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!session?.user?.id || !userId) return
    fetch(`/api/follow?userId=${userId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data) {
          setCount(data.data.followers || 0)
        }
      })
      .catch(() => {})
  }, [session?.user?.id, userId])

  const handleFollow = async () => {
    if (!session?.user?.id || loading) return
    setLoading(true)
    try {
      if (following) {
        await fetch(`/api/follow?followedId=${userId}`, { method: 'DELETE' })
        setFollowing(false)
        setCount(c => Math.max(0, c - 1))
      } else {
        await fetch('/api/follow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followedId: userId }),
        })
        setFollowing(true)
        setCount(c => c + 1)
      }
    } catch {}
    setLoading(false)
  }

  if (!session?.user?.id || session.user.id === userId) return null

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={className}
      style={{
        padding: '6px 16px',
        background: following ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
        color: following ? 'var(--text-secondary)' : '#fff',
        border: `1px solid ${following ? 'var(--border-color)' : 'var(--accent-primary)'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
      }}
    >
      {loading ? '...' : following ? `Following` : `Follow`}
    </button>
  )
}
