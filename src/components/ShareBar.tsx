'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/context/ToastContext'
import styles from './ShareBar.module.css'

interface ShareBarProps {
  url: string
  title: string
  description?: string
  entityType?: string
  entityId?: string
  variant?: 'row' | 'column' | 'compact'
}

const SOCIAL_URLS: Record<string, (url: string, title: string) => string> = {
  x: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  facebook: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  linkedin: (u, t) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  telegram: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  whatsapp: (u, t) => `https://wa.me/?text=${encodeURIComponent(t + ' ' + u)}`,
  email: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`,
}

export default function ShareBar({ url, title, description, entityType, entityId, variant = 'row' }: ShareBarProps) {
  const { data: session } = useSession()
  const { success, error } = useToast()
  const [showShareFeed, setShowShareFeed] = useState(false)
  const [feedContent, setFeedContent] = useState('')
  const [sharing, setSharing] = useState(false)

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      success('Link copied!')
    } catch {
      error('Failed to copy')
    }
  }

  const handleShareToFeed = async () => {
    if (!session?.user?.id) { error('Sign in to share to feed'); return }
    if (!entityType || !entityId) { error('Cannot share this item to feed'); return }
    setShowShareFeed(true)
    setFeedContent(`🔗 Check this out: ${title}\n${fullUrl}`)
  }

  const handleSubmitFeed = async () => {
    if (!feedContent.trim()) return
    setSharing(true)
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: feedContent.trim(), entityType, entityId }),
      })
      if (res.ok) {
        success('Shared to feed!')
        setShowShareFeed(false)
      } else {
        error('Failed to share')
      }
    } catch {
      error('Failed to share')
    }
    setSharing(false)
  }

  const handleSocialShare = (key: string) => {
    const fn = SOCIAL_URLS[key]
    if (!fn) return
    window.open(fn(fullUrl, title), '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  return (
    <>
      <div className={`${styles.bar} ${styles[variant]}`}>
        <button className={styles.btn} onClick={handleCopyLink} title="Copy link">
          <span className={styles.icon}>🔗</span>
          <span className={styles.label}>Copy Link</span>
        </button>

        {session?.user && entityType && entityId && (
          <button className={styles.btn} onClick={handleShareToFeed} title="Share to feed">
            <span className={styles.icon}>📡</span>
            <span className={styles.label}>Share to Feed</span>
          </button>
        )}

        <button className={styles.btn} onClick={() => handleSocialShare('x')} title="Share on X">
          <span className={styles.icon}>𝕏</span>
          <span className={styles.label}>X</span>
        </button>

        <button className={styles.btn} onClick={() => handleSocialShare('facebook')} title="Share on Facebook">
          <span className={styles.icon}>fb</span>
          <span className={styles.label}>Facebook</span>
        </button>

        <button className={styles.btn} onClick={() => handleSocialShare('linkedin')} title="Share on LinkedIn">
          <span className={styles.icon}>in</span>
          <span className={styles.label}>LinkedIn</span>
        </button>

        <button className={styles.btn} onClick={() => handleSocialShare('telegram')} title="Share on Telegram">
          <span className={styles.icon}>✈️</span>
          <span className={styles.label}>Telegram</span>
        </button>

        <button className={styles.btn} onClick={() => handleSocialShare('whatsapp')} title="Share on WhatsApp">
          <span className={styles.icon}>💬</span>
          <span className={styles.label}>WhatsApp</span>
        </button>

        <button className={styles.btn} onClick={() => handleSocialShare('email')} title="Share via Email">
          <span className={styles.icon}>✉️</span>
          <span className={styles.label}>Email</span>
        </button>
      </div>

      {showShareFeed && (
        <div className={styles.overlay} onClick={() => setShowShareFeed(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Share to Feed</h3>
            <textarea
              className={styles.textarea}
              value={feedContent}
              onChange={e => setFeedContent(e.target.value)}
              rows={4}
              placeholder="Write something..."
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowShareFeed(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleSubmitFeed} disabled={sharing || !feedContent.trim()}>
                {sharing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
