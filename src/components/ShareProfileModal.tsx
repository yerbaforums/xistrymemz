'use client'

import { useState } from 'react'
import styles from './ShareProfileModal.module.css'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { useToast } from '@/context/ToastContext'

interface ShareProfileModalProps {
  isOpen: boolean
  onClose: () => void
  username: string
  displayName: string
}

export function ShareProfileModal({ isOpen, onClose, username, displayName }: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false)
  const modalRef = useFocusTrap(isOpen, onClose)
  const { error: toastError } = useToast()

  if (!isOpen) return null

  const url = typeof window !== 'undefined' ? window.location.href : `https://xistrymemz.xyz/profile/${username}`
  const shareText = `Check out ${displayName}'s profile on XistrYmemZ!`

  const shareLinks = [
    {
      id: 'twitter',
      name: 'X / Twitter',
      icon: '/social-logos/twitter.svg',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '/social-logos/facebook.svg',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: '/social-logos/linkedin.svg',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '/social-logos/reddit.svg',
      url: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(shareText)}`
    },
    {
      id: 'pinterest',
      name: 'Pinterest',
      icon: '/social-logos/pinterest.svg',
      url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(shareText)}`
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '/social-logos/telegram.svg',
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '/social-logos/whatsapp.svg',
      url: `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + url)}`
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '/social-logos/instagram.svg',
      url: 'https://instagram.com'
    },
    {
      id: 'mastodon',
      name: 'Mastodon',
      icon: '/social-logos/mastodon.svg',
      url: `https://s2f.kytta.dev/?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`
    },
    {
      id: 'email',
      name: 'Email',
      icon: '/social-logos/email.svg',
      url: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(url)}`
    },
    {
      id: 'fediverse',
      name: 'Fediverse',
      icon: '/social-logos/fediverse.svg',
      url: 'https://jointhefediverse.net'
    }
  ]

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName} | XistrYmemZ`,
          text: shareText,
          url
        })
      } catch {
        toastError('Share failed')
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={e => e.key === 'Escape' && onClose()}>
      <div className={`${styles.modal} modal`} onClick={e => e.stopPropagation()} ref={modalRef}>
        <div className={styles.header}>
          <h3>Share Profile</h3>
          <button onClick={onClose} className={styles.closeBtn}>&times;</button>
        </div>

        <div className={styles.profilePreview}>
          <div className={styles.profileIcon}>{displayName[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div className={styles.profileName}>{displayName}</div>
            <div className={styles.profileHandle}>@{username}</div>
          </div>
        </div>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button onClick={handleNativeShare} className={styles.nativeShareBtn}>
            <span>📤</span> Share via device
          </button>
        )}

        <div className={styles.socialGrid}>
          {shareLinks.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialBtn}
              onClick={onClose}
            >
              <img src={link.icon} alt={link.name} width={20} height={20} />
              <span>{link.name}</span>
            </a>
          ))}
        </div>

        <div className={styles.copySection}>
          <label className={styles.copyLabel}>Profile Link</label>
          <div className={styles.copyRow}>
            <input
              type="text"
              value={url}
              readOnly
              className={styles.copyInput}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button onClick={handleCopyLink} className={styles.copyBtn}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
