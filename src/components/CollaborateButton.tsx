'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import styles from './CollaborateButton.module.css'

interface Props {
  entityType: 'PRODUCT' | 'EVENT' | 'GROUP' | 'PROJECT' | 'SERVICE' | 'REQUEST'
  entityId: string
  label?: string
  variant?: 'primary' | 'secondary'
  intents?: string[]
}

const INTENT_OPTIONS: Record<string, { icon: string; label: string }> = {
  COLLABORATE: { icon: '🤝', label: 'Collaborate' },
  VOLUNTEER: { icon: '🙋', label: 'Volunteer' },
  PARTNER: { icon: '🤲', label: 'Partner' },
  MENTOR: { icon: '🧑‍🏫', label: 'Mentor' },
}

export default function CollaborateButton({
  entityType,
  entityId,
  label,
  variant = 'primary',
  intents = ['COLLABORATE', 'PARTNER', 'MENTOR'],
}: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedIntent, setSelectedIntent] = useState(intents[0])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!session) {
      router.push('/auth/login')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/collab-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, intent: selectedIntent, message: message || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setMessage('') }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send request')
    }
    setSending(false)
  }

  return (
    <>
      <button
        className={`${styles.trigger} ${variant === 'secondary' ? styles.triggerSecondary : ''}`}
        onClick={() => session ? setOpen(true) : router.push('/auth/login')}
      >
        {label || '🤝 Collaborate'}
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>🤝 Reach Out</h3>
            {done ? (
              <div className={styles.done}>✅ Request sent!</div>
            ) : (
              <>
                <div className={styles.intentRow}>
                  {intents.map(i => (
                    <button
                      key={i}
                      className={`${styles.intentPill} ${selectedIntent === i ? styles.intentPillActive : ''}`}
                      onClick={() => setSelectedIntent(i)}
                    >
                      {INTENT_OPTIONS[i]?.icon} {INTENT_OPTIONS[i]?.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className={styles.textarea}
                  placeholder="Write a brief message explaining what you're looking for..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                />
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.modalActions}>
                  <button className={styles.cancelBtn} onClick={() => setOpen(false)}>Cancel</button>
                  <button className={styles.sendBtn} onClick={handleSubmit} disabled={sending}>
                    {sending ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
