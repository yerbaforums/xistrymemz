'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './InviteWidget.module.css'

export default function InviteWidget() {
  const [code, setCode] = useState('')
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const { success } = useToast()

  useEffect(() => {
    fetch('/api/invite')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) { setCode(data.inviteCode); setCount(data.inviteCount) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = () => {
    if (!code) return
    const link = `${window.location.origin}/auth/register?ref=${code}`
    navigator.clipboard.writeText(link)
    success('Invite link copied!')
  }

  if (loading) return null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>📨</span>
        <div>
          <div className={styles.title}>Invite Friends</div>
          <div className={styles.sub}>Share your personal link. {count > 0 ? `${count} people joined via you!` : 'No invites yet.'}</div>
        </div>
      </div>
      {code && (
        <div className={styles.codeBox}>
          <input
            className={styles.codeInput}
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?ref=${code}`}
            readOnly
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button className={styles.copyBtn} onClick={handleCopy}>Copy Link</button>
        </div>
      )}
    </div>
  )
}
