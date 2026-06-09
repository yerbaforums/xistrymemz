'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import ImageUploader from '@/components/ImageUploader'
import AssetPicker from '@/components/AssetPicker'
import type { UserAsset } from '@/components/AssetPicker'
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

const ASSET_ICONS: Record<string, string> = {
  PRODUCT: '🛒',
  SERVICE: '🔧',
  EVENT: '📅',
  GROUP: '👥',
  PLAN: '🚀',
  REQUEST: '📝',
  SCHOOL_CONTENT: '📚',
  POST: '✏️',
  SHOP: '🏪',
  USER: '👤',
}

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
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 90)
    return d.toISOString().slice(0, 16)
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [selectedAsset, setSelectedAsset] = useState<UserAsset | null>(null)

  const expiryPresets = useMemo(() => {
    const now = new Date()
    const day = 86400000
    return {
      '7d': new Date(now.getTime() + 7 * day).toISOString().slice(0, 16),
      '30d': new Date(now.getTime() + 30 * day).toISOString().slice(0, 16),
      '90d': new Date(now.getTime() + 90 * day).toISOString().slice(0, 16),
    }
  }, [])

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
      const images = imageUrls.length > 0 ? imageUrls : undefined
      const res = await fetch(`/api/boards/${boardSlug}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          images,
          category,
          entityType: selectedAsset?.type || undefined,
          entityId: selectedAsset?.id || undefined,
          entityTitle: selectedAsset?.title || undefined,
          entityImage: selectedAsset?.image || undefined,
          latitude: selectedAsset?.latitude || undefined,
          longitude: selectedAsset?.longitude || undefined,
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
            Images (optional)
            <ImageUploader images={imageUrls} onChange={setImageUrls} maxImages={6} />
          </label>

          <AssetPicker
            selectedAsset={selectedAsset}
            onSelect={(asset) => {
              setSelectedAsset(asset)
              if (asset && !title) setTitle(asset.title)
            }}
          />

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
            <div className={styles.expiryPresets}>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['7d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['7d'])}>7 days</button>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['30d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['30d'])}>30 days</button>
              <button type="button" className={`${styles.expiryPresetBtn} ${expiresAt === expiryPresets['90d'] ? styles.expiryPresetActive : ''}`} onClick={() => setExpiresAt(expiryPresets['90d'])}>90 days</button>
            </div>
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
