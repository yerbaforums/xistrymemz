'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import styles from './Rating.module.css'
import { useToast } from '@/context/ToastContext'
import Button from '@/components/ui/Button'

interface VoteData {
  id: string
  userId: string
}

interface ResponseData {
  id: string
  content: string
  userId: string
  createdAt: string
  user: { id: string; name: string | null; image: string | null }
}

interface RatingData {
  id: string
  rating: number
  comment: string | null
  ratingImages: string | null
  type: string
  rater: { id: string; name: string | null; image: string | null }
  votes: VoteData[]
  responses: ResponseData[]
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
  const [imageUrls, setImageUrls] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userRating, setUserRating] = useState<RatingData | null>(null)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  const [responseContent, setResponseContent] = useState('')
  const [respondingLoading, setRespondingLoading] = useState(false)
  const { error: toastError, success: toastSuccess } = useToast()

  const fetchRatings = useCallback(async () => {
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
        setUserRating(data.userRating || null)
      }
    } catch {
      toastError('Failed to load ratings')
    } finally {
      setLoading(false)
    }
  }, [userId, productId, type, toastError])

  useEffect(() => {
    fetchRatings()
  }, [fetchRatings])

  const openRatingForm = () => {
    if (userRating) {
      setNewRating(userRating.rating)
      setComment(userRating.comment || '')
      setImageUrls(userRating.ratingImages || '')
    } else {
      setNewRating(5)
      setComment('')
      setImageUrls('')
    }
    setShowRatingForm(true)
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
          type,
          ratingImages: imageUrls || null
        })
      })

      if (res.ok) {
        setShowRatingForm(false)
        setComment('')
        setImageUrls('')
        setNewRating(5)
        fetchRatings()
        toastSuccess('Rating submitted')
      } else {
        toastError('Failed to submit rating')
      }
    } catch {
      toastError('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleVote = async (ratingId: string) => {
    if (!session?.user) {
      toastError('Sign in to vote')
      return
    }
    try {
      const res = await fetch(`/api/ratings/${ratingId}/vote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setRatings(prev => prev.map(r => {
          if (r.id === ratingId) {
            const voted = data.data.userVoted
            const userId = session.user!.id
            const newVotes = voted
              ? [...r.votes, { id: 'temp', userId }]
              : r.votes.filter(v => v.userId !== userId)
            return { ...r, votes: newVotes }
          }
          return r
        }))
      }
    } catch {
      toastError('Failed to vote')
    }
  }

  const submitResponse = async (ratingId: string) => {
    if (!responseContent.trim()) return
    setRespondingLoading(true)
    try {
      const res = await fetch(`/api/ratings/${ratingId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: responseContent.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        setRatings(prev => prev.map(r => {
          if (r.id === ratingId) {
            return { ...r, responses: [...r.responses, data.data] }
          }
          return r
        }))
        setResponseContent('')
        setRespondingTo(null)
        toastSuccess('Response posted')
      } else {
        toastError('Failed to post response')
      }
    } catch {
      toastError('Failed to post response')
    } finally {
      setRespondingLoading(false)
    }
  }

  const deleteResponse = async (ratingId: string) => {
    try {
      const res = await fetch(`/api/ratings/${ratingId}/respond`, { method: 'DELETE' })
      if (res.ok) {
        setRatings(prev => prev.map(r => {
          if (r.id === ratingId) {
            return { ...r, responses: r.responses.filter(resp => resp.userId !== session?.user?.id) }
          }
          return r
        }))
        toastSuccess('Response removed')
      }
    } catch {
      toastError('Failed to remove response')
    }
  }

  const parseImages = (imagesJson: string | null): string[] => {
    if (!imagesJson) return []
    try {
      const parsed = JSON.parse(imagesJson)
      if (Array.isArray(parsed)) return parsed.filter((u): u is string => typeof u === 'string')
      return []
    } catch {
      return imagesJson.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  const canRate = session?.user && session.user.id !== userId
  const isRatee = session?.user && session.user.id === userId

  if (loading) {
    return (
      <div className="rating-loading" style={{ padding: '12px 0' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {[1,2,3,4,5].map(i => <span key={i} style={{ color: 'var(--bg-tertiary)' }}>★</span>)}
        </div>
        <div style={{ width: '120px', height: '14px', background: 'var(--bg-tertiary)', borderRadius: '4px' }} />
      </div>
    )
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
          onClick={openRatingForm} 
          className={styles.rateBtn}
          aria-label={userRating ? "Edit your review" : "Leave a review"}
        >
          {userRating ? 'Edit your review' : 'Leave a Review'}
        </button>
      )}

      {showRatingForm && (
        <div className={styles.ratingForm}>
          <h4>{userRating ? 'Edit your review' : `Rate this ${type.toLowerCase()}`}</h4>
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
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Image URLs (comma-separated, optional)</label>
            <input
              type="text"
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
              placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              className={styles.imageInput}
            />
          </div>
          <div className={styles.ratingFormActions}>
            <Button 
              onClick={() => setShowRatingForm(false)} 
              variant="ghost"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={submitRating} 
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : (userRating ? 'Update Review' : 'Submit Review')}
            </Button>
          </div>
        </div>
      )}

      {ratings.length > 0 && (
        <div className={styles.ratingList}>
          {ratings.slice(0, 5).map(rating => {
            const isOwnRating = userRating && rating.id === userRating.id
            const images = parseImages(rating.ratingImages)
            const voteCount = rating.votes.length
            const userVoted = session?.user ? rating.votes.some(v => v.userId === session.user!.id) : false
            const myResponse = session?.user ? rating.responses.find(r => r.userId === session.user!.id) : null

            return (
            <div key={rating.id} className={`${styles.ratingItem} ${isOwnRating ? styles.ownRating : ''}`}>
              <div className={styles.ratingItemHeader}>
                <span className={styles.ratingUser}>{rating.rater.name || 'Anonymous'}{isOwnRating && <span className={styles.ownBadge}>You</span>}</span>
                <span className={styles.ratingStarsInline}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <span key={star} style={{ color: star <= rating.rating ? '#FFD700' : '#ccc' }}>★</span>
                  ))}
                </span>
              </div>
              {rating.comment && <p className={styles.ratingComment}>{rating.comment}</p>}
              {images.length > 0 && (
                <div className={styles.imageGrid}>
                  {images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className={styles.imageThumb}>
                      <img src={url} alt={`Review image ${i + 1}`} />
                    </a>
                  ))}
                </div>
              )}
              <span className={styles.ratingDate}>
                {new Date(rating.createdAt).toLocaleDateString()}
              </span>

              <div className={styles.ratingActions}>
                <button
                  onClick={() => toggleVote(rating.id)}
                  className={`${styles.helpfulBtn} ${userVoted ? styles.helpfulBtnActive : ''}`}
                >
                  {userVoted ? '✓ ' : ''}Helpful ({voteCount})
                </button>
                {isRatee && !myResponse && (
                  <button
                    onClick={() => { setRespondingTo(rating.id); setResponseContent('') }}
                    className={styles.respondBtn}
                  >
                    Respond
                  </button>
                )}
              </div>

              {rating.responses.length > 0 && (
                <div className={styles.responses}>
                  {rating.responses.map(resp => (
                    <div key={resp.id} className={styles.responseItem}>
                      <div className={styles.responseHeader}>
                        <span className={styles.responseUser}>{resp.user.name || 'Anonymous'}</span>
                        <span className={styles.responseDate}>{new Date(resp.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className={styles.responseContent}>{resp.content}</p>
                      {resp.userId === session?.user?.id && (
                        <button onClick={() => deleteResponse(rating.id)} className={styles.deleteResponseBtn}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {respondingTo === rating.id && (
                <div className={styles.responseForm}>
                  <textarea
                    value={responseContent}
                    onChange={e => setResponseContent(e.target.value)}
                    placeholder="Write your response..."
                    rows={2}
                  />
                  <div className={styles.responseFormActions}>
                    <Button onClick={() => setRespondingTo(null)} variant="ghost" size="sm" disabled={respondingLoading}>
                      Cancel
                    </Button>
                    <Button onClick={() => submitResponse(rating.id)} variant="primary" size="sm" disabled={respondingLoading}>
                      {respondingLoading ? 'Posting...' : 'Post Response'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
