'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.message) return

    setStatus('loading')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setStatus('success')
        setStatusMessage('Thank you for your message! We\'ll get back to you soon.')
        setForm({ name: '', email: '', subject: '', message: '' })
      } else {
        setStatus('error')
        setStatusMessage('Failed to send message. Please try again.')
      }
    } catch {
      setStatus('error')
      setStatusMessage('Failed to send message. Please try again.')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <h1>Contact Us</h1>
          <p className={styles.heroSubtitle}>
            Have questions or need support? We&apos;d love to hear from you.
          </p>
        </section>

        <div className={styles.content}>
          <div className={styles.info}>
            <div className={styles.infoCard}>
              <h3>General Inquiries</h3>
              <p>Questions about the platform, partnerships, or collaborations.</p>
              <span className={styles.infoHint}>Use the form to send us a message</span>
            </div>

            <div className={styles.infoCard}>
              <h3>Technical Support</h3>
              <p>Need help with your account or using the platform?</p>
              <span className={styles.infoHint}>Use the form to send us a message</span>
            </div>

            <div className={styles.infoCard}>
              <h3>Report Issues</h3>
              <p>Found a bug or inappropriate content? Let us know.</p>
              <span className={styles.infoHint}>Use the form to send us a message</span>
            </div>

            <div className={styles.infoCard}>
              <h3>Join Our Community</h3>
              <p>Connect with other members and stay updated.</p>
              <div className={styles.socialLinks}>
                <Link href="/community">Community</Link>
                <Link href="/events">Events</Link>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <h2>Send a Message</h2>
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">Select a topic</option>
                <option value="general">General Inquiry</option>
                <option value="support">Technical Support</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="partnership">Partnership</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Message *</label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Tell us how we can help..."
                rows={6}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending...' : 'Send Message'}
            </button>

            {statusMessage && (
              <p className={status === 'success' ? styles.successMsg : styles.errorMsg}>
                {statusMessage}
              </p>
            )}
          </form>
        </div>

        <section className={styles.faq}>
          <h2>Quick Answers</h2>
          <div className={styles.faqGrid}>
            <Link href="/help" className={styles.faqItem}>
              <h3>How do I get started?</h3>
              <p>Learn the basics of using XistrYmemZ</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>How do I reset my password?</h3>
              <p>Get help with account access</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>How do I report content?</h3>
              <p>Learn about our reporting system</p>
            </Link>
            <Link href="/help" className={styles.faqItem}>
              <h3>How do I create a plan?</h3>
              <p>Step-by-step guide to creating projects</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
