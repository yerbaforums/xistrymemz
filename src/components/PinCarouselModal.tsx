'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './PinCarouselModal.module.css'

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
  latitude?: number | null
  longitude?: number | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  category: string | null
  expiresAt: string | null
  user: PinUser
  createdAt: string
}

interface PinCarouselModalProps {
  pins: Pin[]
  initialIndex: number
  onClose: () => void
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

export default function PinCarouselModal({ pins, initialIndex, onClose }: PinCarouselModalProps) {
  const [index, setIndex] = useState(initialIndex)
  const [imageIndex, setImageIndex] = useState(0)
  const pin = pins[index]

  const goNext = useCallback(() => setIndex(i => (i + 1) % pins.length), [pins.length])
  const goPrev = useCallback(() => setIndex(i => (i - 1 + pins.length) % pins.length), [pins.length])

  useEffect(() => {
    setImageIndex(0)
  }, [index])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, goNext, goPrev])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!pin) return null

  const parsedImages = pin.images ? JSON.parse(pin.images) as string[] : []
  const currentImage = parsedImages[imageIndex] || pin.entityImage

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
        <span className={styles.counter}>{index + 1} / {pins.length}</span>

        <button className={`${styles.navBtn} ${styles.navPrev}`} onClick={goPrev}>‹</button>
        <button className={`${styles.navBtn} ${styles.navNext}`} onClick={goNext}>›</button>

        <div className={styles.content}>
          <div className={styles.imageSection}>
            {currentImage ? (
              <div className={styles.mainImageWrap}>
                <Image src={currentImage} alt="" fill style={{ objectFit: 'contain' }} />
              </div>
            ) : (
              <div className={styles.noImage}>📌</div>
            )}
            {parsedImages.length > 1 && (
              <div className={styles.thumbnails}>
                {parsedImages.map((img, i) => (
                  <button
                    key={i}
                    className={`${styles.thumb} ${i === imageIndex ? styles.thumbActive : ''}`}
                    onClick={() => setImageIndex(i)}
                  >
                    <Image src={img} alt="" width={48} height={48} style={{ objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.infoSection}>
            <div className={styles.infoHeader}>
              <span className={styles.categoryBadge} style={{ background: getCategoryColor(pin.category) }}>
                {getCategoryLabel(pin.category)}
              </span>
              <span className={styles.date}>{new Date(pin.createdAt).toLocaleDateString()}</span>
            </div>

            {pin.title && <h2 className={styles.title}>{pin.title}</h2>}
            {pin.content && <p className={styles.content}>{pin.content}</p>}

            <div className={styles.userRow}>
              <div className={styles.avatar}>
                {pin.user.image ? (
                  <Image src={pin.user.image} alt={pin.user.name || ''} width={32} height={32} />
                ) : (
                  <span className={styles.avatarInitial}>{(pin.user.name || 'U')[0]}</span>
                )}
              </div>
              <span>{pin.user.name || 'Unknown'}</span>
            </div>

            {pin.entityType && pin.entityId && (
              <Link
                href={entityHref(pin.entityType, pin.entityId)}
                className={styles.entityLink}
              >
                📎 {pin.entityTitle || `${pin.entityType.replace('_', ' ')}`} →
              </Link>
            )}

            {(pin.contactName || pin.contactEmail || pin.contactPhone) && (
              <div className={styles.contactSection}>
                <strong>Contact</strong>
                {pin.contactName && <span>{pin.contactName}</span>}
                {pin.contactEmail && <a href={`mailto:${pin.contactEmail}`}>{pin.contactEmail}</a>}
                {pin.contactPhone && <span>{pin.contactPhone}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function entityHref(type: string, id: string): string {
  switch (type) {
    case 'USER': return `/profile/${id}`
    case 'PRODUCT': return `/products/${id}`
    case 'SERVICE': return `/services/${id}`
    case 'SHOP': return `/shop/${id}`
    case 'EVENT': return `/events/${id}`
    case 'GROUP': return `/groups/${id}`
    case 'PROJECT': return `/projects/${id}`
    case 'REQUEST': return `/requests/${id}`
    case 'POST': return `/posts/${id}`
    case 'SCHOOL_CONTENT': return `/school/content/${id}`
    default: return '#'
  }
}
