'use client'

import { useState } from 'react'
import styles from './ShareButton.module.css'

interface ShareButtonProps {
  url: string
  title: string
  description?: string
}

export default function ShareButton({ url, title, description }: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(fullUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
    linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description || '')}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent(title)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(title)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(description || '')}%0A%0A${encodeURIComponent(fullUrl)}`
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = fullUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <button className={styles.shareBtn} onClick={() => setShowModal(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3"/>
          <circle cx="6" cy="12" r="3"/>
          <circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share
      </button>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Share this {title.includes('Request') ? 'request' : title.includes('Product') ? 'product' : 'post'}</h3>
            
            <div className={styles.shareLinks}>
              <a href={shareLinks.twitter} target="_blank" rel="noopener noreferrer" className={styles.shareLink} style={{background: '#1DA1F2'}}>
                <span>𝕏</span> Twitter
              </a>
              <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className={styles.shareLink} style={{background: '#4267B2'}}>
                <span>f</span> Facebook
              </a>
              <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className={styles.shareLink} style={{background: '#0077B5'}}>
                <span>in</span> LinkedIn
              </a>
              <a href={shareLinks.reddit} target="_blank" rel="noopener noreferrer" className={styles.shareLink} style={{background: '#FF4500'}}>
                <span>⬆</span> Reddit
              </a>
              <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer" className={styles.shareLink} style={{background: '#0088CC'}}>
                <span>✈</span> Telegram
              </a>
              <a href={shareLinks.email} className={styles.shareLink} style={{background: '#666'}}>
                <span>✉</span> Email
              </a>
            </div>

            <div className={styles.copyLink}>
              <input type="text" value={fullUrl} readOnly className={styles.linkInput} />
              <button onClick={copyToClipboard} className={styles.copyBtn}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            <button className={styles.closeBtn} onClick={() => setShowModal(false)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}
