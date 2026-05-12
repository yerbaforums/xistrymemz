'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/context/ToastContext'

type ItemType = 'PLAN' | 'PRODUCT' | 'REQUEST' | 'EVENT' | 'FORUM_POST'

interface SaveButtonProps {
  itemType: ItemType
  itemId: string
  size?: 'sm' | 'md'
}

export default function SaveButton({ itemType, itemId, size = 'sm' }: SaveButtonProps) {
  const { status } = useSession()
  const router = useRouter()
  const { error: toastError } = useToast()
  const [saved, setSaved] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/saved')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.saved) {
          const match = data.saved.find(
            (s: { itemType: string; itemId: string; id: string }) =>
              s.itemType === itemType && s.itemId === itemId
          )
          if (match) {
            setSaved(true)
            setSavedId(match.id)
          }
        }
      })
      .catch(() => { toastError('Failed to load saved status') })
  }, [status, itemType, itemId])

  const toggle = async () => {
    if (status !== 'authenticated') {
      router.push('/auth/login')
      return
    }

    setLoading(true)
    try {
      if (saved && savedId) {
        const res = await fetch(`/api/saved/${savedId}`, { method: 'DELETE' })
        if (res.ok) {
          setSaved(false)
          setSavedId(null)
        }
      } else {
        const res = await fetch('/api/saved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemType, itemId })
        })
        const data = await res.json()
        if (res.ok) {
          setSaved(true)
          setSavedId(data.saved.id)
        }
      }
    } catch {
      toastError('Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') return null

  const btnSize = size === 'sm' ? { padding: '4px 10px', fontSize: '0.75rem' } : { padding: '8px 16px', fontSize: '0.85rem' }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      style={{
        ...btnSize,
        cursor: loading ? 'not-allowed' : 'pointer',
        border: `1px solid ${saved ? 'var(--accent-primary)' : 'var(--border-color)'}`,
        borderRadius: 'var(--radius-md)',
        background: saved ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
        color: saved ? 'var(--accent-primary)' : 'var(--text-secondary)',
        fontWeight: 500,
        transition: 'var(--transition)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
      title={saved ? 'Remove from saved' : 'Save'}
    >
      {saved ? '★ Saved' : '☆ Save'}
    </button>
  )
}
