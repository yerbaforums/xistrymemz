'use client'

import { useState } from 'react'
import styles from './ReviewPrompt.module.css'
import Button from '@/components/ui/Button'

interface ReviewPromptProps {
  open: boolean
  onClose: () => void
  targetType: string
  targetLabel: string
  onSubmit: (rating: number, comment: string) => Promise<void> | void
}

export default function ReviewPrompt({ open, onClose, targetType, targetLabel, onSubmit }: ReviewPromptProps) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onSubmit(rating, comment)
      setRating(5)
      setComment('')
      onClose()
    } catch {
      // error handled by parent
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h3 className={styles.title}>Review {targetType}</h3>
        <p className={styles.subtitle}>How was your experience with {targetLabel}?</p>
        <div className={styles.starInput}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={styles.starBtn}
              style={{ color: star <= rating ? '#FFD700' : '#ccc' }}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience (optional)..."
          rows={3}
          className={styles.textarea}
        />
        <div className={styles.actions}>
          <Button onClick={onClose} variant="ghost" disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  )
}
