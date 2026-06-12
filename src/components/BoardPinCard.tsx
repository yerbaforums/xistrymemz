'use client'

import { memo, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getUserProfileUrl } from '@/lib/utils'
import LinkedEntityDetail from '@/components/LinkedEntityDetail'
import { useToast } from '@/context/ToastContext'
import styles from './BoardPinCard.module.css'

interface PinUser {
  id: string
  name: string | null
  image: string | null
}

interface Pin {
  id: string
  title: string | null
  content: string | null
  images: string | null
  entityType: string | null
  entityId: string | null
  entityTitle: string | null
  entityImage: string | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  category: string | null
  expiresAt: string | null
  isPinned: boolean
  userId: string
  user: PinUser
  createdAt: string
  latitude?: number | null
  longitude?: number | null
  pinOrder?: number
  likeCount?: number
  commentCount?: number
  eventDate?: string | null
}

interface BoardPinCardProps {
  pin: Pin
  isOwner: boolean
  isBoardOwner: boolean
  boardSlug: string
  onDelete: (pinId: string) => void
  onFlyTo?: (pin: Pin) => void
  onEdit?: (pinId: string) => void
  onView?: (pinId: string) => void
}

function getEntityHref(type: string | null, id: string | null): string {
  if (!type || !id) return '#'
  switch (type) {
    case 'USER': return `/profile/${id}`
    case 'PRODUCT': return `/products/${id}`
    case 'SERVICE': return `/services/${id}`
    case 'SHOP': return `/shop/${id}`
    case 'EVENT': return `/events/${id}`
    case 'GROUP': return `/groups/${id}`
    case 'PLAN': return `/plans/${id}`
    case 'REQUEST': return `/requests/${id}`
    case 'POST': return `/posts/${id}`
    case 'SCHOOL_CONTENT': return `/school/content/${id}`
    default: return '#'
  }
}

function getEntityIcon(type: string | null): string {
  switch (type) {
    case 'USER': return '👤'
    case 'PRODUCT': return '🛒'
    case 'SERVICE': return '🔧'
    case 'SHOP': return '🏪'
    case 'EVENT': return '📅'
    case 'GROUP': return '👥'
    case 'PLAN': return '🚀'
    case 'REQUEST': return '📝'
    case 'POST': return '✏️'
    case 'SCHOOL_CONTENT': return '📚'
    default: return '📌'
  }
}

function getCategoryLabel(category: string | null): string {
  switch (category) {
    case 'LOST_FOUND': return 'Lost & Found'
    case 'PROMOTION': return 'Promotion'
    case 'EVENT': return 'Event'
    case 'SERVICE': return 'Service'
    case 'HOUSING': return 'Housing'
    case 'JOBS': return 'Jobs'
    case 'FREE': return 'Free'
    default: return 'General'
  }
}

function getCategoryColor(category: string | null): string {
  switch (category) {
    case 'LOST_FOUND': return '#f59e0b'
    case 'PROMOTION': return '#3b82f6'
    case 'EVENT': return '#8b5cf6'
    case 'SERVICE': return '#10b981'
    case 'HOUSING': return '#ec4899'
    case 'JOBS': return '#14b8a6'
    case 'FREE': return '#22c55e'
    default: return '#6b7280'
  }
}

function timeUntilExpires(expiresAt: string | null): string | null {
  if (!expiresAt) return null
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d left`
  if (hours > 0) return `${hours}h left`
  return 'Expiring soon'
}

function ImageCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0)
  const len = images.length
  if (len === 0) return null
  const prev = useCallback(() => setCurrent(c => (c - 1 + len) % len), [len])
  const next = useCallback(() => setCurrent(c => (c + 1) % len), [len])
  return (
    <div className={styles.carousel}>
      <div className={styles.carouselInner}>
        <div className={styles.carouselImageWrap}>
          <Image src={images[current]} alt="" fill sizes="(max-width: 768px) 100vw, 320px" style={{ objectFit: 'cover' }} />
        </div>
        {len > 1 && (
          <>
            <button className={`${styles.carouselBtn} ${styles.carouselPrev}`} onClick={prev} aria-label="Previous image">‹</button>
            <button className={`${styles.carouselBtn} ${styles.carouselNext}`} onClick={next} aria-label="Next image">›</button>
          </>
        )}
      </div>
      {len > 1 && (
        <div className={styles.carouselDots}>
          {images.map((_, i) => (
            <button key={i} className={`${styles.carouselDot} ${i === current ? styles.carouselDotActive : ''}`} onClick={() => setCurrent(i)} aria-label={`Image ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  )
}

const BoardPinCard = memo(function BoardPinCard({ pin, isOwner, isBoardOwner, boardSlug, onDelete, onFlyTo, onView, onEdit }: BoardPinCardProps) {
  const { success: toastSuccess } = useToast()
  const [minimized, setMinimized] = useState(false)
  const [likes, setLikes] = useState(pin.likeCount || 0)
  const [liked, setLiked] = useState(false)
  const [liking, setLiking] = useState(false)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentList, setCommentList] = useState<{ id: string; content: string; user: { name: string | null; image: string | null } }[]>([])
  const [commentCount, setCommentCount] = useState(pin.commentCount || 0)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const parsedImages = pin.images ? JSON.parse(pin.images) as string[] : []
  const expirationText = timeUntilExpires(pin.expiresAt)
  const canDelete = isOwner || isBoardOwner

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/boards/${boardSlug}/pins/${pin.id}/like`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setLiked(data.liked)
        setLikes(data.count)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [boardSlug, pin.id])

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    try {
      const res = await fetch(`/api/boards/${boardSlug}/pins/${pin.id}/like`, { method: 'POST' })
      const data = await res.json()
      setLiked(data.liked)
      setLikes(data.count)
    } catch {}
    setLiking(false)
  }

  const handleComment = async () => {
    if (!commentText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/boards/${boardSlug}/pins/${pin.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      if (res.ok) {
        const newComment = await res.json()
        setCommentList(prev => [newComment, ...prev])
        setCommentCount(c => c + 1)
        setCommentText('')
      }
    } catch {}
    setSubmitting(false)
  }

  const loadComments = async () => {
    if (commentsLoading || commentList.length > 0) return
    setCommentsLoading(true)
    try {
      const res = await fetch(`/api/boards/${boardSlug}/pins/${pin.id}/comments`)
      const data = await res.json()
      setCommentList(data.comments || [])
    } catch {}
    setCommentsLoading(false)
  }

  const toggleComments = () => {
    if (!showCommentForm && commentList.length === 0) loadComments()
    setShowCommentForm(!showCommentForm)
  }

  const isEventPin = pin.entityType === 'EVENT' && pin.entityId
  const [eventJoiners, setEventJoiners] = useState(0)
  const [eventJoined, setEventJoined] = useState(false)
  const [eventJoining, setEventJoining] = useState(false)

  useEffect(() => {
    if (!isEventPin) return
    const controller = new AbortController()
    fetch(`/api/events/${pin.entityId}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        const count = data._count?.eventJoiners || data.joiners?.length || 0
        setEventJoiners(count)
        setEventJoined(data.joined || false)
      })
      .catch(() => {})
    return () => controller.abort()
  }, [pin.entityId, isEventPin])

  const handleEventJoin = async () => {
    if (!pin.entityId || eventJoining) return
    setEventJoining(true)
    try {
      if (eventJoined) {
        const res = await fetch(`/api/events/${pin.entityId}/join`, { method: 'DELETE' })
        if (res.ok) { setEventJoined(false); setEventJoiners(c => Math.max(0, c - 1)) }
      } else {
        const res = await fetch(`/api/events/${pin.entityId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'ATTENDEE' }),
        })
        if (res.ok) { setEventJoined(true); setEventJoiners(c => c + 1) }
      }
    } catch {} finally { setEventJoining(false) }
  }

  return (
    <div className={`${styles.card} ${minimized ? styles.minimized : ''}`} style={pin.isPinned ? { borderColor: 'var(--accent-primary)' } : undefined}>
      {pin.isPinned && <div className={styles.pinnedBadge}>📌 Pinned</div>}

      <div className={styles.minimizeToggle} onClick={() => setMinimized(!minimized)}>
        {minimized ? '▲' : '▼'}
      </div>

      <div className={styles.header}>
        <Link href={getUserProfileUrl({ id: pin.user.id, username: '' })} className={styles.userLink}>
          <div className={styles.avatar}>
            {pin.user.image ? (
              <Image src={pin.user.image} alt={pin.user.name || ''} width={28} height={28} />
            ) : (
              <span className={styles.avatarInitial}>{(pin.user.name || 'U')[0]}</span>
            )}
          </div>
          <span className={styles.userName}>{pin.user.name || 'Unknown'}</span>
        </Link>
        <span className={styles.categoryBadge} style={{ background: getCategoryColor(pin.category) }}>
          {getCategoryLabel(pin.category)}
        </span>
      </div>

      {pin.title && <h4 className={styles.title}>{pin.title}</h4>}

      {!minimized && (
        <>
          {pin.content && <p className={styles.content}>{pin.content}</p>}
          {parsedImages.length > 0 && <ImageCarousel images={parsedImages} />}
          {pin.entityType && pin.entityId && (
            <LinkedEntityDetail entityType={pin.entityType} entityId={pin.entityId} />
          )}
          {isEventPin && (
            <div className={styles.eventActions}>
              <span className={styles.eventAttendees}>👥 {eventJoiners} attending</span>
              <button
                className={`${styles.eventJoinBtn} ${eventJoined ? styles.eventJoined : ''}`}
                onClick={handleEventJoin}
                disabled={eventJoining}
              >
                {eventJoining ? '...' : eventJoined ? '✓ Attending' : 'Join Event'}
              </button>
            </div>
          )}
          {(pin.contactName || pin.contactEmail || pin.contactPhone) && (
            <div className={styles.contact}>
              <span className={styles.contactLabel}>Contact:</span>
              {pin.contactName && <span>{pin.contactName}</span>}
              {pin.contactEmail && <a href={`mailto:${pin.contactEmail}`} className={styles.contactLink}>{pin.contactEmail}</a>}
              {pin.contactPhone && <span>{pin.contactPhone}</span>}
            </div>
          )}
        </>
      )}

      <div className={styles.footer}>
        <span className={styles.date}>{new Date(pin.createdAt).toLocaleDateString()}</span>
        {expirationText && (
          <span className={`${styles.expiry} ${expirationText === 'Expired' ? styles.expired : ''}`}>
            {expirationText === 'Expired' ? '❌ Expired' : `⏳ ${expirationText}`}
          </span>
        )}
        <div className={styles.footerActions}>
          {pin.latitude && pin.longitude && onFlyTo && (
            <button className={styles.viewBtn} onClick={() => onFlyTo(pin)} aria-label="Fly to on map">📍</button>
          )}
          {onView && (
            <button className={styles.viewBtn} onClick={() => onView(pin.id)} aria-label="View in carousel">🔍</button>
          )}
          {canDelete && (
            <>
              <button className={styles.editBtn} onClick={() => onEdit?.(pin.id)} aria-label="Edit pin">✏️</button>
              <button className={styles.deleteBtn} onClick={() => onDelete(pin.id)} aria-label="Delete pin">🗑️</button>
            </>
          )}
        </div>
      </div>

      <div className={styles.socialActions}>
        <button className={`${styles.socialBtn} ${liked ? styles.socialBtnActive : ''}`} onClick={handleLike} disabled={liking} aria-label="Like">
          {liked ? '❤️' : '🤍'} <span>{likes}</span>
        </button>
        <button className={styles.socialBtn} onClick={toggleComments} aria-label="Comment">
          💬 <span>{commentCount}</span>
        </button>
        <button className={styles.socialBtn} onClick={() => {
          const url = `${window.location.origin}/boards/${boardSlug}?pin=${pin.id}`
          if (navigator.share) {
            navigator.share({ title: pin.title || '', text: pin.content || '', url })
          } else {
            navigator.clipboard.writeText(url).then(() => toastSuccess('Link copied!'))
          }
        }} aria-label="Share">
          🔗
        </button>
      </div>

      {showCommentForm && (
        <div className={styles.commentSection}>
          <div className={styles.commentForm}>
            <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment..." className={styles.commentInput}
              onKeyDown={e => { if (e.key === 'Enter' && commentText.trim() && !submitting) handleComment() }} />
            <button className={styles.commentBtn} disabled={!commentText.trim() || submitting} onClick={handleComment}>
              {submitting ? '...' : 'Post'}
            </button>
          </div>
          {commentsLoading && <div className={styles.commentsLoading}>Loading comments...</div>}
          {!commentsLoading && commentList.length > 0 && (
            <div className={styles.commentsList}>
              {commentList.map(c => (
                <div key={c.id} className={styles.commentItem}>
                  <span className={styles.commentAuthor}>{c.user.name || 'User'}:</span> {c.content}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
})

export default BoardPinCard
