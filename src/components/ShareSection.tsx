'use client'

import { useState } from 'react'
import ShareToPostModal from '@/components/ShareToPostModal'
import styles from './ShareSection.module.css'

interface ShareSectionProps {
  title: string
  description?: string | null
  referenceType: 'PRODUCT' | 'SERVICE' | 'EVENT' | 'REQUEST' | 'PLAN'
  referenceId: string
  referenceTitle: string
  referenceImage?: string | null
}

export default function ShareSection({ title, description, referenceType, referenceId, referenceTitle, referenceImage }: ShareSectionProps) {
  const [copiedShare, setCopiedShare] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedShare(true)
    setTimeout(() => setCopiedShare(false), 2000)
  }

  const nativeShare = () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({
        title,
        text: description || `Check out ${title}`,
        url: window.location.href,
      }).catch(() => {})
    }
  }

  const url = typeof window !== 'undefined' ? window.location.href : ''

  return (
    <div className={styles.shareCard}>
      <h3 className={styles.heading}>🔗 Share</h3>
      <div className={styles.shareButtons}>
        <button className={styles.shareBtn} onClick={copyLink} title="Copy link">
          {copiedShare ? '✓ Copied!' : '📋 Copy Link'}
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button className={styles.shareBtn} onClick={nativeShare} title="Share">
            📤 Share
          </button>
        )}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${title} on XistrYmemZ`)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.shareBtn}
          title="Share on X"
        >
          𝕏 Post
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.shareBtn}
          title="Share on Facebook"
        >
          f Share
        </a>
        <button onClick={() => setShowShareModal(true)} className={styles.shareBtn} title="Share via Post">
          📝 Post
        </button>
      </div>
      <ShareToPostModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        referenceType={referenceType}
        referenceId={referenceId}
        referenceTitle={referenceTitle}
        referenceImage={referenceImage}
      />
    </div>
  )
}
