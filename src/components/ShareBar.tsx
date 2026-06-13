'use client'

import { useState } from 'react'
import { useToast } from '@/context/ToastContext'
import { SOCIAL_PLATFORMS, buildShareUrl } from '@/lib/share-links'
import styles from './ShareBar.module.css'

export type ShareEntityType =
  | 'POST' | 'PRODUCT' | 'SERVICE' | 'EVENT' | 'PROJECT'
  | 'REQUEST' | 'SCHOOLCONTENT' | 'GROUP' | 'SHOP' | 'SCHOOL'
  | 'FORUMPOST' | 'PROFILE'

interface ShareBarProps {
  entityType: ShareEntityType
  title: string
  description?: string | null
  image?: string | null
  variant?: 'inline' | 'compact'
}

export default function ShareBar({ entityType, title, description, image, variant = 'inline' }: ShareBarProps) {
  const { success, error } = useToast()
  const [url] = useState(() => typeof window !== 'undefined' ? window.location.href : '')
  const [showFull, setShowFull] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      success('Link copied!')
    } catch {
      error('Failed to copy')
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return }
    try {
      await navigator.share({ title, text: description || title, url })
    } catch { /* user cancelled */ }
  }

  if (variant === 'compact') {
    return (
      <div className={styles.compact}>
        <button onClick={copyLink} className={styles.compactBtn} title="Copy link">🔗</button>
        <button onClick={nativeShare} className={styles.compactBtn} title="Share">📤</button>
      </div>
    )
  }

  return (
    <div className={styles.bar}>
      <button onClick={copyLink} className={styles.btn} title="Copy link">
        <span className={styles.btnIcon}>🔗</span>
        <span className={styles.btnLabel}>Copy Link</span>
      </button>
      <button onClick={nativeShare} className={styles.btn} title="Share via device">
        <span className={styles.btnIcon}>📤</span>
        <span className={styles.btnLabel}>Share</span>
      </button>
      <div className={styles.socialRow}>
        {SOCIAL_PLATFORMS.slice(0, 4).map(p => (
          <a
            key={p.key}
            href={buildShareUrl(p, title, url)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.socialBtn}
            title={p.label}
          >
            <img src={p.icon} alt={p.label} width={16} height={16} />
          </a>
        ))}
        {SOCIAL_PLATFORMS.length > 4 && (
          <button onClick={() => setShowFull(!showFull)} className={styles.moreBtn}>
            {showFull ? '▲' : '···'}
          </button>
        )}
      </div>

      {showFull && (
        <div className={styles.fullRow}>
          {SOCIAL_PLATFORMS.slice(4).map(p => (
            <a
              key={p.key}
              href={buildShareUrl(p, title, url)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              title={p.label}
            >
              <img src={p.icon} alt={p.label} width={16} height={16} />
              <span className={styles.socialLabel}>{p.label}</span>
            </a>
          ))}
        </div>
      )}

      {image && (
        <div className={styles.preview}>
          <img src={image} alt="" className={styles.previewImg} />
          <div className={styles.previewInfo}>
            <span className={styles.previewType}>{entityType}</span>
            <span className={styles.previewTitle}>{title}</span>
          </div>
        </div>
      )}
    </div>
  )
}
