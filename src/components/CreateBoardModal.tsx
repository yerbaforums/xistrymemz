'use client'

import { useState } from 'react'
import styles from './CreateBoardModal.module.css'

interface CreateBoardModalProps {
  onClose: () => void
  onCreated: () => void
  initialCity?: string
  initialLat?: number
  initialLng?: number
}

export default function CreateBoardModal({ onClose, onCreated, initialCity, initialLat, initialLng }: CreateBoardModalProps) {
  const [name, setName] = useState(initialCity ? `${initialCity} Board` : '')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState(initialCity || '')
  const [latitude, setLatitude] = useState(initialLat?.toString() || '')
  const [longitude, setLongitude] = useState(initialLng?.toString() || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !location.trim()) {
      setError('Name and location are required')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          location: location.trim(),
          latitude: latitude ? parseFloat(latitude) : undefined,
          longitude: longitude ? parseFloat(longitude) : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create board')
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
          <h3>📌 Create a Bulletin Board</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label}>
            Board Name *
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="Downtown Springfield Board"
              required
            />
          </label>

          <label className={styles.label}>
            Location *
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className={styles.input}
              placeholder="Springfield, IL"
              required
            />
          </label>

          <div className={styles.row}>
            <label className={styles.label}>
              Latitude
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={e => setLatitude(e.target.value)}
                className={styles.input}
                placeholder="40.7128"
              />
            </label>
            <label className={styles.label}>
              Longitude
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={e => setLongitude(e.target.value)}
                className={styles.input}
                placeholder="-74.006"
              />
            </label>
          </div>

          <label className={styles.label}>
            Description (optional)
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="What is this board about?"
              rows={3}
            />
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? 'Creating...' : '📌 Create Board'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
