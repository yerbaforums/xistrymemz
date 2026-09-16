'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'

interface StarButtonProps {
  itemType: string
  itemId: string
  className?: string
  title?: string
}

// ⭐ Star (save) toggle persisted via /api/saved. Renders nothing when signed out.
export default function StarButton({ itemType, itemId, className, title = 'Save' }: StarButtonProps) {
  const { data: session } = useSession()
  let toast: { success: (m: string) => void; error: (m: string) => void }
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    toast = useToast()
  } catch {
    toast = { success: () => {}, error: () => {} }
  }
  const { success, error } = toast
  const [saved, setSaved] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  if (!session?.user) return null

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/saved', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType, itemId }),
      })
      if (res.ok) {
        setSaved(!saved)
        if (!saved) success('Saved to your stars!')
      } else {
        error('Failed to save')
      }
    } catch {
      error('Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      className={className}
      onClick={toggle}
      disabled={busy}
      title={saved ? 'Unstar' : title}
      aria-label={saved ? 'Remove star' : 'Star this'}
      aria-pressed={!!saved}
      style={saved ? { color: '#f59e0b' } : undefined}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  )
}
