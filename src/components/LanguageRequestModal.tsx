'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastContext'
import styles from './LanguageRequestModal.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LanguageRequestModal({ open, onClose }: Props) {
  const { success, error } = useToast()
  const [language, setLanguage] = useState('')
  const [nativeName, setNativeName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!language.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/language-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language.trim(),
          nativeName: nativeName.trim(),
          email: email.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        success(`Request for "${language}" submitted!`)
        setLanguage('')
        setNativeName('')
        setEmail('')
        onClose()
      } else {
        error(data.error || 'Failed to submit request')
      }
    } catch {
      error('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Request a language">
        <div className={styles.header}>
          <h2 className={styles.title}>Request a Language</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.description}>
            Want to use XistrYmemZ in a language we don't support yet? Let us know!
          </p>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lang-request-language">Language *</label>
            <input
              id="lang-request-language"
              className={styles.input}
              type="text"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              placeholder="e.g. Vietnamese, Thai, Greek..."
              required
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lang-request-native">Native name</label>
            <input
              id="lang-request-native"
              className={styles.input}
              type="text"
              value={nativeName}
              onChange={e => setNativeName(e.target.value)}
              placeholder="e.g. Tiếng Việt, ภาษาไทย, Ελληνικά..."
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lang-request-email">Email (optional)</label>
            <input
              id="lang-request-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Notify me when available"
            />
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || !language.trim()}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
