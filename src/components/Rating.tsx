'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import styles from './Rating.module.css'

interface RatingData {
  id: string
  rating: number
  comment: string | null
  type: string
  rater: { id: string; name: string | null; image: string | null }
  createdAt: string
}

interface RatingDisplayProps {
  userId: string
  productId?: string
  type?: 'SELLER' | 'BUYER' | 'PRODUCT'
}

export default function RatingDisplay({ userId, productId, type = 'SELLER' }: RatingDisplayProps) {
  const { data: session } = useSession()
  const [ratings, setRatings] = useState<RatingData[]>([])
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [newRating, setNewRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchRatings()
  }, [userId, productId])

  const fetchRatings = async () => {
    try {
      const url = new URL('/api/ratings', window.location.origin)
      url.searchParams.set('userId', userId)
      if (productId) url.searchParams.set('productId', productId)
      if (type) url.searchParams.set('type', type)
      
      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        setRatings(data.ratings || [])
        setAverageRating(data.averageRating || 0)
        setTotalRatings(data.totalRatings || 0)
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitRating = async () => {
    if (!session?.user) return
    setSubmitting(true)

    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productId: productId || null,
          rating: newRating,
          comment: comment || null,
          type
        })
      })

      if (res.ok) {
        setShowRatingForm(false)
        setComment('')
        setNewRating(5)
        fetchRatings()
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const canRate = session?.user && session.user.id !== userId

  if (loading) {
    return <div className="rating-loading">Loading ratings...</div>
  }

  return (
    <div className={styles.ratingDisplay}>
      <div className={styles.ratingHeader}>
        <div className={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map(star => (
            <span 
              key={star} 
              className={`star ${star <= averageRating ? 'filled' : ''}`}
              style={{ color: star <= averageRating ? '#FFD700' : '#ccc' }}
            >
              ★
            </span>
          ))}
        </div>
        <span className={styles.ratingCount}>
          {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
        </span>
      </div>

      {canRate && !showRatingForm && (
        <button 
          onClick={() => setShowRatingForm(true)} 
          className={styles.rateBtn}
          aria-label="Leave a review"
        >
          Leave a Review
        </button>
      )}

      {showRatingForm && (
        <div className={styles.ratingForm}>
          <h4>Rate this {type.toLowerCase()}</h4>
          <div className={styles.ratingInput}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setNewRating(star)}
                className={styles.starBtn}
                style={{ color: star <= newRating ? '#FFD700' : '#ccc' }}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a review (optional)..."
            rows={3}
          />
          <div className={styles.ratingFormActions}>
            <button 
              onClick={() => setShowRatingForm(false)} 
              className="btn-ghost"
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              onClick={submitRating} 
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className={styles.ratingList}>
          {ratings.slice(0, 5).map(rating => (
            <div key={rating.id} className={styles.ratingItem}>
              <div className={styles.ratingItemHeader}>
                <span className={styles.ratingUser}>{rating.rater.name || 'Anonymous'}</span>
                <span className={styles.ratingStarsInline}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} style={{ color: star <= rating.rating ? '#FFD700' : '#ccc' }}>★</span>
                  ))}
                </span>
              </div>
              {rating.comment && <p className={styles.ratingComment}>{rating.comment}</p>}
              <span className={styles.ratingDate}>
                {new Date(rating.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
