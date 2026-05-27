'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import styles from './ShareBar.module.css'

export type ShareEntityType =
  | 'PRODUCT' | 'SERVICE' | 'EVENT' | 'REQUEST' | 'PLAN'
  | 'SCHOOLCONTENT' | 'FORUMPOST' | 'GROUP' | 'SHOP' | 'SCHOOL' | 'POST' | 'PROFILE'

interface ShareBarProps {
  entityType: ShareEntityType
  entityId: string
  title: string
  description?: string
  image?: string | null
  variant?: 'bar' | 'modal-trigger'
}

const SOCIAL_LINKS: { key: string; label: string; color: string }[] = [
  { key: 'x', label: 'X', color: '#000' },
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'telegram', label: 'Telegram', color: '#26A5E4' },
  { key: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
  { key: 'email', label: 'Email', color: '#EA4335' },
  { key: 'fediverse', label: 'Fediverse', color: '#6364FF' },
]

const DESTINATIONS = [
  { key: 'PROFILE', label: 'My Profile' },
  { key: 'SHOP', label: 'My Shop' },
  { key: 'SCHOOL', label: 'My School' },
] as const

function getShareUrl(entityType: ShareEntityType, entityId: string): string {
  if (typeof window === 'undefined') return ''
  const base = window.location.origin
  switch (entityType) {
    case 'PROFILE': return `${base}/profile/${entityId}`
    case 'PRODUCT': return `${base}/products/${entityId}`
    case 'SERVICE': return `${base}/services/${entityId}`
    case 'EVENT': return `${base}/events/${entityId}`
    case 'REQUEST': return `${base}/requests/${entityId}`
    case 'PLAN': return `${base}/plans/${entityId}`
    case 'GROUP': return `${base}/groups/${entityId}`
    case 'SHOP': return `${base}/shop/${entityId}`
    case 'SCHOOL': return `${base}/school/${entityId}`
    case 'SCHOOLCONTENT': return `${base}/school/${entityId}`
    case 'FORUMPOST': return `${base}/forum/${entityId}`
    case 'POST': return `${base}/posts/${entityId}`
    default: return base
  }
}

export default function ShareBar({
  entityType,
  entityId,
  title,
  description,
  image,
  variant = 'bar',
}: ShareBarProps) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [showFeedModal, setShowFeedModal] = useState(false)
  const [feedContent, setFeedContent] = useState('')
  const [feedDestination, setFeedDestination] = useState<'PROFILE' | 'SHOP' | 'SCHOOL'>('PROFILE')
  const [posting, setPosting] = useState(false)

  const url = getShareUrl(entityType, entityId)
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)
  const encodedDesc = description ? encodeURIComponent(description) : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied!')
    } catch {
      error('Failed to copy link')
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) {
      copyLink()
      return
    }
    try {
      await navigator.share({ title, text: description || title, url })
    } catch { }
  }

  const socialUrl = (key: string): string => {
    switch (key) {
      case 'x': return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
      case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
      case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
      case 'telegram': return `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
      case 'whatsapp': return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`
      case 'email': return `mailto:?subject=${encodedTitle}&body=${encodedDesc ? encodedDesc + '%0A%0A' : ''}${encodedUrl}`
      case 'fediverse': return `https://${url}`
      default: return url
    }
  }

  const handleShareToFeed = async () => {
    if (!session || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: feedContent.trim() || `Shared a ${entityType.toLowerCase()}`,
          context: feedDestination,
          referenceType: entityType,
          referenceId: entityId,
          referenceTitle: title,
        }),
      })
      if (res.ok) {
        success('Posted!')
        setFeedContent('')
        setShowFeedModal(false)
        setShowModal(false)
      } else {
        const data = await res.json()
        error(data.error || 'Failed to post')
      }
    } catch {
      error('Failed to post')
    } finally {
      setPosting(false)
    }
  }

  const hasShop = !!(session?.user as any)?.shopSlug
  const hasSchool = !!(session?.user as any)?.schoolSlug

  if (variant === 'modal-trigger') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={styles.triggerBtn}
          title="Share"
        >
          🔗
        </button>
        {showModal && renderModal()}
      </>
    )
  }

  return (
    <div className={styles.bar}>
      <button onClick={copyLink} className={styles.barBtn} title="Copy link">
        📋 Copy
      </button>
      <button onClick={nativeShare} className={styles.barBtn} title="Share">
        📤 Share
      </button>
      <button onClick={() => window.open(socialUrl('x'), '_blank', 'noopener')} className={styles.barBtn} title="Share on X">
        𝕏
      </button>
      <button onClick={() => window.open(socialUrl('facebook'), '_blank', 'noopener')} className={styles.barBtn} title="Share on Facebook">
        f
      </button>
      <button onClick={() => setShowModal(true)} className={styles.barBtn} title="More options">
        ⋯
      </button>
      {showModal && renderModal()}
    </div>
  )

  function renderModal() {
    return (
      <div className={styles.overlay} onClick={() => setShowModal(false)}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Share</h3>
            <button onClick={() => setShowModal(false)} className={styles.closeBtn}>×</button>
          </div>

          <div className={styles.preview}>
            {image && <img src={image} alt="" className={styles.previewImage} />}
            <div>
              <div className={styles.previewType}>{entityType}</div>
              <div className={styles.previewTitle}>{title}</div>
            </div>
          </div>

          <div className={styles.copySection}>
            <input type="text" readOnly value={url} className={styles.copyInput} />
            <button onClick={copyLink} className={styles.copyBtn}>Copy</button>
          </div>

          <button onClick={nativeShare} className={styles.nativeShare}>
            📤 Share via...
          </button>

          <div className={styles.socialGrid}>
            {SOCIAL_LINKS.map(link => (
              <a
                key={link.key}
                href={link.key === 'fediverse' ? undefined : socialUrl(link.key)}
                target={link.key === 'fediverse' ? undefined : '_blank'}
                rel={link.key === 'fediverse' ? undefined : 'noopener'}
                onClick={link.key === 'fediverse' ? copyLink : undefined}
                className={styles.socialBtn}
                style={{ '--btn-color': link.color } as React.CSSProperties}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className={styles.divider} />

          <button onClick={() => setShowFeedModal(true)} className={styles.feedBtn}>
            📝 Share to Feed
          </button>

          {showFeedModal && (
            <div className={styles.feedOverlay} onClick={() => setShowFeedModal(false)}>
              <div className={styles.feedModal} onClick={e => e.stopPropagation()}>
                <h4 className={styles.feedTitle}>Share to Post</h4>
                <textarea
                  value={feedContent}
                  onChange={e => setFeedContent(e.target.value)}
                  placeholder="Add a comment (optional)..."
                  rows={3}
                  className={styles.feedTextarea}
                />
                <div className={styles.destinationSection}>
                  <div className={styles.destinationLabel}>Post to:</div>
                  <div className={styles.destinationRow}>
                    {DESTINATIONS.map(d => {
                      const disabled = (d.key === 'SHOP' && !hasShop) || (d.key === 'SCHOOL' && !hasSchool)
                      return (
                        <button
                          key={d.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => setFeedDestination(d.key)}
                          className={`${styles.destBtn} ${feedDestination === d.key ? styles.destBtnActive : ''}`}
                        >
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className={styles.feedActions}>
                  <button onClick={() => setShowFeedModal(false)} className={styles.cancelBtn}>Cancel</button>
                  <button onClick={handleShareToFeed} disabled={posting} className={styles.shareBtn}>
                    {posting ? 'Posting...' : 'Share'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
}
