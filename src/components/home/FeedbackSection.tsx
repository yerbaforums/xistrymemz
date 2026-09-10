'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import styles from './FeedbackSection.module.css'
import { useToast } from '@/context/ToastContext'

const CATEGORIES = ['Bug Report', 'Feature Request', 'General Feedback', 'Question', 'Other']

export default function FeedbackSection() {
  const { data: session } = useSession()
  const { success: toastSuccess, error: toastError } = useToast()
  const [category, setCategory] = useState(CATEGORIES[0])
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim() })
      })
      if (res.ok) {
        setMessage('')
        setSubmitted(true)
        toastSuccess('Feedback submitted!')
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
    <section className={styles.section}>
      <div className={styles.badge}>v0.8.0 — Now Live</div>
      <h2 className={styles.title}>You Shape What&apos;s Next</h2>
      <p className={styles.subtitle}>
        XistrYmemZ is <strong>open source</strong> and <strong>community-driven</strong>.
        No ads, no data selling, no algorithms. Every feature exists because users asked for it.
      </p>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>💡</div>
          <h3>Have an Idea?</h3>
          <p>Feature requests and suggestions go straight into the development pipeline.</p>
          <Link href="/feedback" className={styles.cardLink}>Request a Feature →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🐛</div>
          <h3>Found a Bug?</h3>
          <p>Report issues directly — every bug filed gets tracked and resolved.</p>
          <Link href="/feedback" className={styles.cardLink}>Report a Bug →</Link>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🔧</div>
          <h3>Open Source</h3>
          <p>Contribute code, suggest improvements, or fork the project on GitHub.</p>
          <a href="https://github.com/yerbaforums/xistrymemz" target="_blank" rel="noopener noreferrer" className={styles.cardLink}>
            View on GitHub →
          </a>
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>🌍</div>
          <h3>Our Vision</h3>
          <p>A cooperative platform where users own their data and shape the direction.</p>
          <Link href="/about" className={styles.cardLink}>Read Our Mission →</Link>
        </div>
      </div>

      <div className={styles.miniForm}>
        <h3>Quick Feedback</h3>
        {submitted ? (
          <p className={styles.thanks}>Thanks for your feedback!</p>
        ) : session?.user ? (
          <form onSubmit={handleSubmit} className={styles.miniFormInner}>
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.miniSelect}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Share your thoughts..."
              className={styles.miniInput}
            />
            <button type="submit" disabled={submitting || !message.trim()} className={styles.miniSubmit}>
              {submitting ? '...' : 'Submit'}
            </button>
          </form>
        ) : (
          <p className={styles.loginPrompt}>
            <Link href="/auth/signin" className={styles.cta}>Sign in</Link> to submit feedback, or{' '}
            <Link href="/feedback">visit the feedback page</Link>.
          </p>
        )}
      </div>

      <p className={styles.footer}>
        Your passport connects everything. Set your location and start building.{' '}
        {session?.user ? (
          <Link href="/dashboard/overview" className={styles.cta}>Go to Dashboard →</Link>
        ) : (
          <Link href="/auth/register" className={styles.cta}>Join us →</Link>
        )}
      </p>
    </section>
  )
}
