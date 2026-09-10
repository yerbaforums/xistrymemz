'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import styles from './page.module.css'
import { useToast } from '@/context/ToastContext'
import Breadcrumbs from '@/components/Breadcrumbs'

interface FeedbackEntry {
  id: string
  category: string
  message: string
  email?: string
  status: string
  createdAt: string
}

const CATEGORIES = ['Bug Report', 'Feature Request', 'General Feedback', 'Question', 'Other']

export default function FeedbackPage() {
  const { data: session } = useSession()
  const { success: toastSuccess, error: toastError } = useToast()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissions, setSubmissions] = useState<FeedbackEntry[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchSubmissions()
    } else {
      setLoadingSubmissions(false)
    }
  }, [session])

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/feedback')
      if (res.ok) {
        const data = await res.json()
        setSubmissions(data.data || [])
      }
    } catch {
      // noop
    } finally {
      setLoadingSubmissions(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    if (!session?.user && !email.trim()) {
      toastError('Email is required for anonymous submissions')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), email: email || undefined, screenshot: screenshot || undefined })
      })
      if (res.ok) {
        setMessage('')
        setScreenshot('')
        toastSuccess('Feedback submitted!')
        if (session?.user) fetchSubmissions()
      } else {
        const data = await res.json()
        toastError(data.error || 'Failed to submit')
      }
    } catch {
      toastError('Failed to submit feedback')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Feedback' }]} />
      <h1>Feedback</h1>
      <p className={styles.subtitle}>Help us improve XistrYmemZ</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe your feedback..."
            rows={4}
            required
          />
        </div>
        {!session?.user && (
          <div className={styles.formGroup}>
            <label>Email (required for anonymous)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
        )}
        <div className={styles.formGroup}>
          <label>Screenshot URL (optional)</label>
          <input
            type="url"
            value={screenshot}
            onChange={e => setScreenshot(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <button type="submit" disabled={submitting} className={styles.submitBtn}>
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {session?.user && (
        <div className={styles.submissions}>
          <h2>My Submissions</h2>
          {loadingSubmissions ? (
            <p className={styles.loading}>Loading...</p>
          ) : submissions.length === 0 ? (
            <p className={styles.empty}>No submissions yet.</p>
          ) : (
            <div className={styles.list}>
              {submissions.map(entry => (
                <div key={entry.id} className={styles.entry}>
                  <div className={styles.entryHeader}>
                    <span className={styles.category}>{entry.category}</span>
                    <span className={`${styles.status} ${entry.status === 'REVIEWED' ? styles.reviewed : ''}`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className={styles.entryMessage}>{entry.message}</p>
                  <span className={styles.entryDate}>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
