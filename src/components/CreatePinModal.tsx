'use client'

import { useState } from 'react'
import styles from './CreatePinModal.module.css'

const PIN_CATEGORIES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'LOST_FOUND', label: 'Lost & Found' },
  { value: 'PROMOTION', label: 'Promotion' },
  { value: 'EVENT', label: 'Event' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'HOUSING', label: 'Housing' },
  { value: 'JOBS', label: 'Jobs' },
  { value: 'FREE', label: 'Free' },
]

const ENTITY_TYPES = [
  { value: '', label: 'None' },
  { value: 'USER', label: 'My Profile' },
  { value: 'SHOP', label: 'My Shop' },
  { value: 'PRODUCT', label: 'My Product' },
  { value: 'SERVICE', label: 'My Service' },
  { value: 'EVENT', label: 'My Event' },
  { value: 'GROUP', label: 'My Group' },
  { value: 'PLAN', label: 'My Project' },
]

interface CreatePinModalProps {
  boardSlug: string
  boardName: string
  onClose: () => void
  onCreated: () => void
}

export default function CreatePinModal({ boardSlug, boardName, onClose, onCreated }: CreatePinModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('GENERAL')
  const [entityType, setEntityType] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [imageUrls, setImageUrls] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setError('Content is required')
      return
    }
    if (!expiresAt) {
      setError('Expiration date is required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const images = imageUrls.trim() ? imageUrls.split('\n').map(s => s.trim()).filter(Boolean) : undefined
      const res = await fetch(`/api/boards/${boardSlug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          images,
          category,
          entityType: entityType || undefined,
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          expiresAt,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create pin')
      }

      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>📌 Pin to {boardName}</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label}>
            Category
            <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
              {PIN_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="Lost Cat - Orange Tabby"
            />
          </label>

          <label className={styles.label}>
            Content *
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className={styles.textarea}
              placeholder="Describe your pin..."
              rows={4}
              required
            />
          </label>

          <label className={styles.label}>
            Image URLs (one per line, optional)
            <textarea
              value={imageUrls}
              onChange={e => setImageUrls(e.target.value)}
              className={styles.textarea}
              placeholder="https://example.com/image.jpg"
              rows={2}
            />
          </label>

          <label className={styles.label}>
            Link an entity (optional)
            <select value={entityType} onChange={e => setEntityType(e.target.value)} className={styles.select}>
              {ENTITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Contact Name (optional)
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              className={styles.input}
              placeholder="Jane Doe"
            />
          </label>

          <label className={styles.label}>
            Contact Email (optional)
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className={styles.input}
              placeholder="jane@example.com"
            />
          </label>

          <label className={styles.label}>
            Contact Phone (optional)
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              className={styles.input}
              placeholder="+1 555-0123"
            />
          </label>

          <label className={styles.label}>
            Expires At *
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className={styles.input}
              required
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Pinning...' : '📌 Pin It'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
